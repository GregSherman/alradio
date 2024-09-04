import EventEmitter from "events";
import jwt from "jsonwebtoken";
import AccountModelService from "../services/db/AccountModelService.js";

class ClientService extends EventEmitter {
  static _clients = new Set();
  static _listeners = new Set();

  constructor() {
    super();
  }

  authenticate(req, res) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.handle;
    } catch (err) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
  }

  static hasActiveClients() {
    return this._clients.size > 0;
  }

  static async addClient(res, handle) {
    if (res) this._clients.add(res);
    if (handle) {
      this._listeners.add(handle);
      await AccountModelService.updateUserOnlineStatus(handle, true);
    }
  }

  static async removeClient(res, handle) {
    this._clients.delete(res);
    this._listeners.delete(handle);
    if (handle) {
      await AccountModelService.updateUserOnlineStatus(handle, false);
    }
  }

  _clientifyMetadata(metadata) {
    return {
      trackId: metadata.trackId,
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      urlForPlatform: metadata.urlForPlatform,
      artUrl: metadata.artUrl,
      userSubmittedId: metadata.userSubmittedId,
      likes: metadata.likes,
      datePlayed: metadata.datePlayed,
    };
  }
}

export default ClientService;
