import ClientService from "./ClientService.js";
import SpotifyService from "../services/spotify.js";
import QueueService from "../services/queue.js";
import HistoryModelService from "../services/db/HistoryModelService.js";
import SongController from "../controllers/songController.js";
import RequestModelService from "../services/db/RequestModelService.js";
import AccountModelService from "../services/db/AccountModelService.js";
import { log } from "../utils/logger.js";

class SongClient extends ClientService {
  async getCurrentSongMetadata(req, res) {
    log("info", "Creating song metadata event stream", this.constructor.name);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const initialMetadata = this._clientifyMetadata(
      SongController.currentSongMetadata,
    );
    res.write(`data: ${JSON.stringify(initialMetadata)}\n\n`);

    const songChangedListener = (newMetadata) => {
      const clientMetadata = this._clientifyMetadata(newMetadata);
      res.write(`data: ${JSON.stringify(clientMetadata)}\n\n`);
      log("info", "Song metadata changed", req.taskId, this.constructor.name);
    };

    SongController.on("songStarted", songChangedListener);
    SongController.on("songEnded", songChangedListener);
    req.on("close", () => {
      SongController.off("songStarted", songChangedListener);
      SongController.off("songEnded", songChangedListener);
      res.end();
      log(
        "info",
        "Song metadata stream closed",
        req.taskId,
        this.constructor.name,
      );
    });

    req.on("error", () => {
      log(
        "info",
        "Song metadata stream error",
        req.taskId,
        this.constructor.name,
      );
    });
  }

  async getSongHistory(req, res) {
    log("info", "Creating song history event stream", this.constructor.name);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let { page } = req.params;
    page = parseInt(page, 10);
    if (isNaN(page) || page < 1) {
      page = 1;
    }

    const sendSongHistory = async () => {
      const songHistory =
        await HistoryModelService.fetchMostRecentlyPlayedTracks(page);
      const isLastPage = await HistoryModelService.isLastPage(page);

      // Do not send the current song in the history
      const currentTrackId = SongController.currentSongMetadata?.trackId;
      if (
        page === 1 &&
        songHistory.length &&
        songHistory[0].trackId === currentTrackId
      ) {
        songHistory.shift();
      }

      const clientifiedHistory = songHistory.map((song) =>
        this._clientifyMetadata(song),
      );
      const response = {
        tracks: clientifiedHistory,
        isLastPage,
      };
      res.write(`data: ${JSON.stringify(response)}\n\n`);
    };

    await sendSongHistory();

    const songEndedListener = async () => {
      log("info", "Sending song history", req.taskId, this.constructor.name);
      await sendSongHistory();
    };

    SongController.on("songEnded", songEndedListener);
    req.on("close", () => {
      SongController.off("songEnded", songEndedListener);
      res.end();
      log(
        "info",
        "Song history stream closed",
        req.taskId,
        this.constructor.name,
      );
    });

    req.on("error", () => {
      log(
        "info",
        "Song history stream error",
        req.taskId,
        this.constructor.name,
      );
    });
  }

  async getNextSong(req, res) {
    log("info", "Creating next song event stream", this.constructor.name);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendNextSongData = () => {
      const nextSongMetadata = this._clientifyMetadata(
        QueueService.getNextQueuedSongMetadata(),
      );
      res.write(`data: ${JSON.stringify(nextSongMetadata)}\n\n`);
      log("info", "Sending next song data", req.taskId, this.constructor.name);
    };

    sendNextSongData();
    const songQueuedListener = () => {
      sendNextSongData();
    };

    QueueService.on("songQueued", songQueuedListener);
    SongController.on("songStarted", songQueuedListener);
    req.on("close", () => {
      QueueService.off("songQueued", songQueuedListener);
      SongController.off("songStarted", songQueuedListener);
      res.end();
      log("info", "Next song stream closed", req.taskId, this.constructor.name);
    });

    req.on("error", () => {
      log("info", "Next song stream error", req.taskId, this.constructor.name);
    });
  }

  async _handleSearchQuerySubmit(req, res, query) {
    log("info", `Searching for track: ${query}`, this.constructor.name);
    try {
      let tracks = await SpotifyService.searchTrack(query);
      if (!tracks.length) {
        log("info", `Track not found: ${query}`, this.constructor.name);
        res.json({ success: false, message: "Song not found" });
        return;
      }

      tracks = tracks.map((track) => this._clientifyMetadata(track));
      res.json({ success: true, tracks });
    } catch (error) {
      log(
        "error",
        `Error searching for track: ${error.message}`,
        this.constructor.name,
      );
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async _handleDirectTrackSubmit(req, res, trackId, userSubmittedId) {
    log("info", `Submitting track: ${trackId}`, this.constructor.name);
    const track = await SpotifyService.getTrackData(trackId);
    if (!track?.trackId) {
      log("info", `Track not found: ${trackId}`, this.constructor.name);
      res.json({ success: false, message: "Song not found" });
      return;
    }

    if (await this._isTrackIdQueued(trackId)) {
      log("info", `Track already in queue: ${trackId}`, this.constructor.name);
      res.json({ success: false, message: "Song is already in the queue." });
      return;
    }

    if (await HistoryModelService.isTrackPlayedInLastHours(trackId)) {
      log(
        "info",
        `Track played too recently: ${trackId}`,
        this.constructor.name,
      );
      res.json({
        success: false,
        message: "Song has been played too recently.",
      });
      return;
    }

    await QueueService.addToUserQueue(trackId, userSubmittedId);
    const queueLength = (await QueueService.getQueueSize()) - 1;
    res.json({ success: true, queueLength });
  }

  async _isTrackIdQueued(trackId) {
    return (
      (await QueueService.userQueueHasTrack(trackId)) ||
      QueueService.audioQueueHasTrack(trackId) ||
      SongController.isTrackIdPlayingOrDownloading(trackId)
    );
  }

  async submitSongRequest(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }
    log(
      "info",
      `User ${authHandle} is submitting a song`,
      this.constructor.name,
    );

    const query = req.body.query;
    if (!query) {
      log(
        "info",
        `User ${authHandle} submitted an invalid query`,
        this.constructor.name,
      );
      return res
        .status(400)
        .json({ message: 'Invalid Request. Expected 1 parameter "query".' });
    }

    if (
      !(await AccountModelService.userHasPermission(
        authHandle,
        "noRateLimit",
      )) &&
      (await RequestModelService.isUserRateLimited(authHandle))
    ) {
      res.json({
        success: false,
        message: "Maximum requests reached. Try again later.",
      });
      log("info", `User ${authHandle} is rate limited`, this.constructor.name);
      return;
    }

    if (req.body.query.length > 256 || req.body.query.trim().length === 0) {
      res.json({ success: false, message: "Song not found" });
      log(
        "info",
        `User ${authHandle} submitted an invalid query`,
        this.constructor.name,
      );
      return;
    }

    if (await QueueService.isUserQueueFull()) {
      res.json({ success: false, message: "The queue is full." });
      log("info", `User submission queue is full`, this.constructor.name);
      return;
    }

    let trackId;
    if (query.includes("spotify.com/track/")) {
      trackId = query.split("/").pop();
    } else if (/^[a-zA-Z0-9]{22}$/.test(query)) {
      trackId = query;
    }

    if (trackId) {
      return this._handleDirectTrackSubmit(req, res, trackId, authHandle);
    } else {
      return this._handleSearchQuerySubmit(req, res, query);
    }
  }
}

export default new SongClient();
