/* eslint-disable no-constant-condition */
import ClientService from "../services/client.js";
import SpotifyService from "../services/spotify.js";
import QueueService from "../services/queue.js";
import OpenAIService from "../services/openai.js";
import DBService from "../services/db.js";
import ProxyService from "../services/proxy.js";

import { EndableError } from "../errors.js";

import fs from "fs";
import Throttle from "throttle";
import ffprobe from "ffprobe";
import ffprobeStatic from "ffprobe-static";
import { exec } from "child_process";
import { promisify } from "util";
import EventEmitter from "events";

class SongController extends EventEmitter {
  constructor() {
    super();
    this.songPlaying = false;
    this.currentSongMetadata = {};
    this.songDownloading = false;
    this.songDownloadingTrackId = null;
  }

  initialize() {
    // Event listeners for the song player
    QueueService.on("songQueued", () => this._player());
    ClientService.on("clientConnected", () => this._player());
    this.on("songEnded", () => this._player());

    // Event listeners for the song gatherer
    this.on("notDownloading", () => this._songGatherer());
    QueueService.on("audioQueueNeedsFilling", () => this._songGatherer());
    this._songGatherer();
  }

  // The song player. it takes the existing audio file and streams it to the clients.
  async _player() {
    if (
      this.songPlaying ||
      !ClientService.hasActiveClients() ||
      QueueService.isAudioQueueEmpty()
    ) {
      console.log(
        "Song player not ready:",
        this.songPlaying,
        !ClientService.hasActiveClients(),
        QueueService.isAudioQueueEmpty(),
      );
      return;
    }
    const { path, metadata } = QueueService.popNextAudioFile() || {};
    if (path) {
      await this._markSongAsPlayed(metadata);
      this._streamToClients(path);
    }
  }

  // The song gatherer. it gets the next song from the queue and downloads it.
  async _songGatherer() {
    if (this.songDownloading || !QueueService.audioQueueNeedsFilling()) {
      console.log(
        "Song gatherer not ready:",
        this.songDownloading,
        !QueueService.audioQueueNeedsFilling(),
      );
      return;
    }

    console.log("Gathering next song");
    let nextTrackId = QueueService.popNextTrack();
    if (!nextTrackId) {
      console.log("No more songs in queue. Populating suggestion queue.");
      await SpotifyService.populateSuggestionQueue();
      nextTrackId = QueueService.popNextTrack();
    }

    this._setStateDownloading(nextTrackId);

    try {
      const trackMetadata = await this.getTrackData(nextTrackId);
      const concatenatedAudioPath = await this._gatherSongFiles(trackMetadata);
      QueueService.addToAudioQueue({
        path: concatenatedAudioPath,
        metadata: trackMetadata,
      });
    } catch (error) {
      if (error instanceof EndableError) {
        // something real bad happened, it will happen again. end the program
        throw error;
      }
      console.error("Error getting next song:", error);
      console.log("Skipping song:", nextTrackId);
    }

    this._setStateNotDownloading();
  }

  _setStateDownloading(trackId) {
    this.songDownloading = true;
    this.songDownloadingTrackId = trackId;
    this.emit("downloading");
    console.log("State set to downloading:", trackId);
  }

  _setStateNotDownloading() {
    this.songDownloading = false;
    this.songDownloadingTrackId = null;
    this.emit("notDownloading");
    console.log("State set to not downloading");
  }

  async _markSongAsPlayed(metadata) {
    this.songPlaying = true;
    this.currentSongMetadata = metadata;
    await DBService.markSongAsPlayed(metadata.trackId);
    console.log("Playing song", metadata.title, " - ", metadata.artist);
    new Promise((resolve) => {
      setTimeout(() => {
        this.emit("currentSongMetadataUpdated", metadata);
        resolve();
      }, 5000);
    });
  }

  _writeDataToClients(data) {
    ClientService._clients.forEach((client) => client.write(data));
  }

  async _getBitrateFromAudioFile(path) {
    const ffprobeResult = await ffprobe(path, {
      path: ffprobeStatic.path,
    });
    return ffprobeResult.streams[0].bit_rate;
  }

  async _streamToClients(path) {
    const bitrate = await this._getBitrateFromAudioFile(path);
    const readable = fs.createReadStream(path);
    const throttle = new Throttle(Math.floor(bitrate / 8));

    throttle
      .on("data", (data) => {
        this._writeDataToClients(data);
      })
      .on("end", () => {
        this.songPlaying = false;
        console.log("Song ended");
        this.emit("songEnded");
        readable.close();
        fs.unlinkSync(path);
      });
    readable.pipe(throttle);
  }

  async _combineAudioFiles(first, second) {
    const concatenatedAudioPath = `./audio/combined-${new Date().getTime()}.mp3`;
    const ffmpeg = promisify(exec);
    await ffmpeg(
      `ffmpeg -i "${first}" -i "${second}" -filter_complex '[0:0][1:0]concat=n=2:v=0:a=1[out]' -map '[out]' -y "${concatenatedAudioPath}"`,
    );
    fs.unlinkSync(first);
    fs.unlinkSync(second);
    return concatenatedAudioPath;
  }

  async getTrackData(trackId) {
    // Fetch metadata from the database or Spotify API
    return (
      (await DBService.getSongMetadata(trackId)) ||
      (await SpotifyService.getTrackData(trackId))
    );
  }

  async _gatherSongFiles(trackMetadata) {
    // Download the track and generate an intro speech. Skip song if either fails
    const audioFilePath = await this._downloadTrack(
      trackMetadata.urlForPlatform.spotify,
    );
    const announcementText = await OpenAIService.generateSongIntro(
      trackMetadata,
      QueueService.getLastQueuedSongMetadata() || this.currentSongMetadata,
    );
    const announcementAudioPath =
      await OpenAIService.textToSpeech(announcementText);
    if (!audioFilePath || !announcementAudioPath) {
      throw new Error(
        "Failed to download track or generate intro speech. Skipping song.",
      );
    }

    return await this._combineAudioFiles(announcementAudioPath, audioFilePath);
  }

  async _downloadTrack(url) {
    const command = `spotdl download ${url} --output="./audio/{track-id}"`;
    const execAsync = promisify(exec);

    for (let failCount = 1; failCount <= 5; failCount++) {
      try {
        await ProxyService.setProxy();
        console.log("Downloading track from:", url);
        await execAsync(command, { timeout: 60000 });

        const fileName = url.split("/track/")[1].split("?")[0];
        const filePath = `./audio/${fileName}.mp3`;

        if (fs.existsSync(filePath)) {
          console.log("Downloaded track:", fileName);
          return filePath;
        }

        // File not found, mark proxy as bad and retry
        ProxyService.markActiveProxyBad();
        console.error(
          "Failed to download track:",
          fileName,
          "Retry:",
          failCount,
        );
      } catch (error) {
        console.error("Error downloading track:", error);
        ProxyService.markActiveProxyBad();
        console.error("Retrying download, attempt:", failCount);
      }
    }
    throw new Error(
      "Failed to download track after 10 attempts. Skipping song.",
    );
  }

  isTrackIdPlayingOrDownloading(trackId) {
    return (
      this.currentSongMetadata?.trackId === trackId ||
      this.songDownloadingTrackId === trackId
    );
  }
}

export default new SongController();
