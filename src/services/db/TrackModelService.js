import HistoryModelService from "./HistoryModelService.js";
import Track from "../../models/Track.js";

class TrackModelService {
  async getSongMetadata(trackId) {
    return Track.findOne({ trackId }).lean().exec();
  }

  async saveSongMetadata(trackData) {
    // create or update track metadata
    const trackId = trackData.trackId;
    await Track.updateOne({ trackId }, trackData, { upsert: true }).exec();
  }

  async markSongAsPlayed(trackId, userId = null) {
    await Track.updateOne({ trackId }, { $inc: { playedCount: 1 } }).exec();
    await HistoryModelService.addPlayedTrack(trackId, userId);
  }
}

export default new TrackModelService();
