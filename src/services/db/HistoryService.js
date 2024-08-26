import History from "../../models/History.js";
import TrackService from "./TrackService.js";

class HistoryService {
  async addPlayedTrack(trackId, userId = null) {
    return History.create({ trackId, userId });
  }

  async fetchRecentlyPlayedTracks(hours) {
    const cutoff = new Date(Date.now() - hours * 3600 * 1000);
    return History.find({ datePlayed: { $gte: cutoff } }).exec();
  }

  async fetchMostRecentlyPlayedTracks(
    page = 1,
    limit = 10,
    userSubmittedId = null,
  ) {
    const skip = (page - 1) * limit;
    const query = userSubmittedId ? { userSubmittedId } : {};

    const history = await History.find(query)
      .sort({ datePlayed: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    // for each trackId in history, get the track metadata
    return Promise.all(
      history.map(async (track) => {
        const metadata = await TrackService.getSongMetadata(track.trackId);
        return metadata;
      }),
    );
  }

  async isTrackPlayedInLastHours(trackId, hours = 3) {
    const recentlyPlayed = await this.fetchRecentlyPlayedTracks(hours);
    return recentlyPlayed.some((track) => track.trackId === trackId);
  }
}

export default new HistoryService();
