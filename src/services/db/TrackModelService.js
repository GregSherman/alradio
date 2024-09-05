import RequestModelService from "./RequestModelService.js";
import Track from "../../models/Track.js";
import HistoryModelService from "./HistoryModelService.js";

class TrackModelService {
  async getSongMetadata(trackId) {
    return Track.findOne({ trackId }).lean().exec();
  }

  async saveSongMetadata(trackData) {
    // create or update track metadata
    const trackId = trackData.trackId;
    await Track.updateOne({ trackId }, trackData, { upsert: true }).exec();
  }

  async markSongAsPlayed(trackId, requestId = null) {
    await Track.updateOne({ trackId }, { $inc: { playedCount: 1 } }).exec();
    if (requestId) {
      await RequestModelService.markRequestAsPlayed(requestId);
    } else {
      await HistoryModelService.addPlayedTrack(trackId);
    }
  }

  async hasMetadataForTrackId(trackId) {
    return Track.exists({ trackId });
  }
}

export default new TrackModelService();
