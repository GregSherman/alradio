import ClientService from "./ClientService.js";
import SpotifyService from "../services/spotify.js";
import QueueService from "../services/queue.js";
import HistoryModelService from "../services/db/HistoryModelService.js";
import SongController from "../controllers/songController.js";

class SongClient extends ClientService {
  async getCurrentSongMetadata(req, res) {
    const metadata = this._clientifyMetadata(
      SongController.currentSongMetadata,
    );
    res.json(metadata);
  }

  async getSongHistory(req, res) {
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
    res.json(clientifiedHistory);
  }

  async getNextSong(req, res) {
    const nextSongMetadata = QueueService.getNextQueuedSongMetadata();
    if (!nextSongMetadata) {
      res.json({ success: false, message: "No songs in queue." });
      return;
    }
    res.json(this._clientifyMetadata(nextSongMetadata));
  }

  async _handleSearchQuerySubmit(req, res, query) {
    try {
      const track = await SpotifyService.searchTrack(query);
      if (!track?.trackId) {
        res.json({ success: false, message: "Song not found" });
        return;
      }

      res.json({ success: true, metadata: this._clientifyMetadata(track) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async _handleDirectTrackSubmit(req, res, trackId, userSubmittedId) {
    const track = await SpotifyService.getTrackData(trackId);
    if (!track?.trackId) {
      res.json({ success: false, message: "Song not found" });
      console.log("Song not found");
      return;
    }

    if (await this._isTrackIdQueued(trackId)) {
      res.json({ success: false, message: "Song is already in the queue." });
      console.log("Song is already in the queue");
      return;
    }

    if (await HistoryModelService.isTrackPlayedInLastHours(trackId)) {
      res.json({
        success: false,
        message: "Song has been played too recently.",
      });
      console.log("Song has been played recently");
      return;
    }

    await QueueService.addToUserQueue(trackId, userSubmittedId);
    res.json({ success: true, message: "Song added to queue." });
  }

  async _isTrackIdQueued(trackId) {
    return (
      (await QueueService.userQueueHasTrack(trackId)) ||
      QueueService.audioQueueHasTrack(trackId) ||
      SongController.isTrackIdPlayingOrDownloading(trackId)
    );
  }

  async submitSongRequest(req, res) {
    const authHandle = this.authenticate(req, res);
    if (!authHandle) {
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
