import Request from "../../models/Request.js";
import History from "../../models/History.js";
import { log } from "../../utils/logger.js";

class RequestModelService {
  async initialize() {
    await Request.updateMany(
      { playStatus: "pending" },
      { playStatus: "requested" },
    );
  }

  async addRequest(trackId, userSubmittedId) {
    log(
      "info",
      `Adding request to user queue: ${trackId} ${userSubmittedId}`,
      this.constructor.name,
    );
    return Request.create({ trackId, userSubmittedId });
  }

  async fetchRecentlyRequestedTracks(hours) {
    const cutoff = new Date(Date.now() - hours * 3600 * 1000);
    return Request.find({ dateRequested: { $gte: cutoff } }).exec();
  }

  async fetchLastRequestedTracks(limit = 10) {
    return Request.find({ playStatus: "requested" })
      .sort({ dateRequested: -1 })
      .limit(limit)
      .exec();
  }

  async fetchLastNRequestedTracksByUser(userSubmittedId, limit = 10, page = 1) {
    const skip = (page - 1) * limit;
    return Request.find({ userSubmittedId })
      .sort({ dateRequested: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async markRequestAsPlayed(requestId) {
    const request = await Request.findById(requestId);
    if (request) {
      request.playStatus = "played";
      const historyEntry = await History.create({
        trackId: request.trackId,
        userSubmittedId: request.userSubmittedId,
      });
      request.historyEntryId = historyEntry._id;
      await request.save();
    }
  }

  async getNextUserRequest() {
    const request = await Request.findOne({
      playStatus: "requested",
    })
      .sort({ dateRequested: 1 })
      .exec();
    if (request) {
      request.playStatus = "pending";
      await request.save();
      return {
        trackId: request.trackId,
        userSubmittedId: request.userSubmittedId,
        requestId: request._id,
      };
    }
  }

  async isQueueFull() {
    return Request.countDocuments({ playStatus: "requested" }) >= 30;
  }

  async isTrackRequested(trackId) {
    return Request.exists({
      trackId,
      playStatus: { $in: ["requested", "pending"] },
    });
  }

  async hasRequestedTracks() {
    return Request.exists({ playStatus: "requested" });
  }

  async updateRequestQueue(newQueue) {
    await Request.deleteMany({ playStatus: { $in: ["requested", "pending"] } });
    await Request.insertMany(newQueue);
  }

  async isUserRateLimited(userSubmittedId) {
    const cutoff = new Date(Date.now() - 3600 * 1000);
    return (
      (await Request.countDocuments({
        userSubmittedId,
        dateRequested: { $gte: cutoff },
      })) >= 3
    );
  }

  async markRequestAsFailed(requestId) {
    const request = await Request.findById(requestId);
    if (request) {
      request.playStatus = "failed";
      await request.save();
    }
  }

  async getQueueSize() {
    return Request.countDocuments({ playStatus: "requested" });
  }
}

export default new RequestModelService();
