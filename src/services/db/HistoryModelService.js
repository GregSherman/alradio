import History from "../../models/History.js";
import TrackModelService from "./TrackModelService.js";

class HistoryModelService {
  async addPlayedTrack(trackId, userSubmittedId = null) {
    console.log("Adding played track to history:", trackId, userSubmittedId);
    return History.create({ trackId, userSubmittedId });
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

    return Promise.all(
      history.map(async (track) => {
        const metadata = await TrackModelService.getSongMetadata(track.trackId);
        return { ...metadata, ...track.toObject() };
      }),
    );
  }

  async isTrackPlayedInLastHours(trackId, hours = 3) {
    const recentlyPlayed = await this.fetchRecentlyPlayedTracks(hours);
    return recentlyPlayed.some((track) => track.trackId === trackId);
  }
}

export default new HistoryModelService();
