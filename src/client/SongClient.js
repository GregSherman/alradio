import ClientService from "./ClientService.js";
import SpotifyService from "../services/spotify.js";
import QueueService from "../services/queue.js";
import HistoryModelService from "../services/db/HistoryModelService.js";
import SongController from "../controllers/songController.js";
import RequestModelService from "../services/db/RequestModelService.js";
import AccountModelService from "../services/db/AccountModelService.js";

class SongClient extends ClientService {
  async getCurrentSongMetadata(req, res) {
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
    };

    SongController.on("songStarted", songChangedListener);
    SongController.on("songEnded", songChangedListener);
    req.on("close", () => {
      SongController.off("songStarted", songChangedListener);
      SongController.on("songEnded", songChangedListener);
      res.end();
    });
  }

  async getSongHistory(req, res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendSongHistory = async () => {
      const songHistory =
        await HistoryModelService.fetchMostRecentlyPlayedTracks();

      // Do not send the current song in the history
      const currentTrackId = SongController.currentSongMetadata?.trackId;
      if (songHistory.length && songHistory[0].trackId === currentTrackId) {
        songHistory.shift();
      }

      const clientifiedHistory = songHistory.map((song) =>
        this._clientifyMetadata(song),
      );
      res.write(`data: ${JSON.stringify(clientifiedHistory)}\n\n`);
    };

    await sendSongHistory();

    const songEndedListener = async () => {
      await sendSongHistory();
    };

    SongController.on("songEnded", songEndedListener);
    req.on("close", () => {
      SongController.off("songEnded", songEndedListener);
      res.end();
    });
  }

  async getNextSong(req, res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendNextSongData = () => {
      const nextSongMetadata = this._clientifyMetadata(
        QueueService.getNextQueuedSongMetadata(),
      );
      res.write(`data: ${JSON.stringify(nextSongMetadata)}\n\n`);
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
    });
  }

  async _handleSearchQuerySubmit(req, res, query) {
    try {
      let tracks = await SpotifyService.searchTrack(query);
      if (!tracks.length) {
        res.json({ success: false, message: "Song not found" });
        return;
      }

      tracks = tracks.map((track) => this._clientifyMetadata(track));
      res.json({ success: true, tracks });
    } catch (error) {
      console.error("Error searching for track:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async _handleDirectTrackSubmit(req, res, trackId, userSubmittedId) {
    const track = await SpotifyService.getTrackData(trackId);
    if (!track?.trackId) {
      res.json({ success: false, message: "Song not found" });
      return;
    }

    if (await this._isTrackIdQueued(trackId)) {
      res.json({ success: false, message: "Song is already in the queue." });
      return;
    }

    if (await HistoryModelService.isTrackPlayedInLastHours(trackId)) {
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
      console.log("User is rate limited");
      return;
    }

    if (req.body.query.length > 256 || req.body.query.trim().length === 0) {
      res.json({ success: false, message: "Song not found" });
      return;
    }

    if (await QueueService.isUserQueueFull()) {
      res.json({ success: false, message: "The queue is full." });
      console.log("User queue is full");
      return;
    }

    const query = req.body.query;
    if (!query) {
      return res
        .status(400)
        .json({ message: 'Invalid Request. Expected 1 parameter "query".' });
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
