/* eslint-disable no-constant-condition */
import ClientService from "../client/ClientService.js";
import StreamClient from "../client/StreamClient.js";
import SpotifyService from "../services/spotify.js";
import QueueService from "../services/queue.js";
import OpenAIService from "../services/openai.js";
import TrackModelService from "../services/db/TrackModelService.js";
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
    StreamClient.on("clientConnected", () => this._player());
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
    let { trackId, userSubmittedId, requestId } =
      await QueueService.popNextTrack();
    console.log("Next song in queue:", trackId, userSubmittedId, requestId);
    if (!trackId) {
      console.log("No more songs in queue. Populating suggestion queue.");
      await SpotifyService.populateSuggestionQueue();
      ({ trackId, userSubmittedId, requestId } =
        await QueueService.popNextTrack());
    }

    this._setStateDownloading(trackId);

    try {
      const trackMetadata = await this.getTrackData(trackId);
      trackMetadata.userSubmittedId = userSubmittedId;
      trackMetadata.requestId = requestId;

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
      console.error("Error getting next song:", error.message);
      console.log("Skipping song:", trackId);
      await QueueService.markSongAsFailed(trackId, requestId);
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
    await TrackModelService.markSongAsPlayed(
      metadata.trackId,
      metadata.requestId,
    );
    console.log(
      "Playing song",
      metadata.title,
      " - ",
      metadata.artist,
      "from",
      metadata.userSubmittedId,
    );
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

    const handleForceStop = () => {
      throttle.end();
    };
    this.on("forceStopSong", handleForceStop);

    throttle
      .on("data", (data) => {
        this._writeDataToClients(data);
      })
      .on("end", () => {
        readable.close();
        this.songPlaying = false;
        this.removeListener("forceStopSong", handleForceStop);
        console.log("Song ended");
        this.emit("songEnded");
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

    // don't remove the sample tts file
    if (process.env.OPENAI_API_KEY) {
      fs.unlinkSync(first);
    }
    fs.unlinkSync(second);
    return concatenatedAudioPath;
  }

  async getTrackData(trackId) {
    // Fetch metadata from the database or Spotify API
    return (
      (await TrackModelService.getSongMetadata(trackId)) ||
      (await SpotifyService.getTrackData(trackId))
    );
  }

  async _gatherSongFiles(trackMetadata) {
    if (!trackMetadata.urlForPlatform.youtube) {
      throw new Error("No youtube url for track. Skipping song.");
    }

    const audioFilePath = await this._downloadTrack(
      trackMetadata.urlForPlatform.youtube,
    );

    let announcementAudioPath;
    // If no API key is set, use the sample tts file
    if (!process.env.OPENAI_API_KEY) {
      announcementAudioPath = "./sample-tts.mp3";
    } else {
      const announcementText = await OpenAIService.generateSongIntro(
        trackMetadata,
        QueueService.getLastQueuedSongMetadata() || this.currentSongMetadata,
      );
      announcementAudioPath =
        await OpenAIService.textToSpeech(announcementText);
    }

    if (!audioFilePath || !announcementAudioPath) {
      throw new Error(
        "Failed to download track or generate intro speech. Skipping song.",
      );
    }

    return await this._combineAudioFiles(announcementAudioPath, audioFilePath);
  }

  async _downloadTrack(url) {
    const fileName = new Date().getTime();
    const filePath = `./audio/${fileName}.mp3`;
    const command = `yt-dlp -x -f 'bestaudio' --output ${filePath} ${url} --audio-format mp3`;
    const execAsync = promisify(exec);

    for (let failCount = 1; failCount <= 10; failCount++) {
      try {
        await ProxyService.setProxy();
        console.log("Downloading track from:", url);
        await execAsync(command, { timeout: 30000 });

        if (fs.existsSync(filePath)) {
          console.log("Downloaded track!");
          return filePath;
        }
      } catch (error) {
        console.error("Error downloading track:", error);
      }

      // Failed, remove files and try again
      ProxyService.markActiveProxyBad();
      console.error("Failed to download track:", url, "Retry:", failCount);
      fs.readdirSync("./audio").forEach((file) => {
        if (file.includes(fileName)) {
          fs.unlinkSync(`./audio/${file}`);
        }
      });
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

  skipCurrentSong() {
    this.emit("forceStopSong");
  }
}

export default new SongController();
