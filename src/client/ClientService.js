import EventEmitter from "events";
import jwt from "jsonwebtoken";
import AccountModelService from "../services/db/AccountModelService.js";

class ClientService extends EventEmitter {
  static _clients = new Set();
  static _listeners = new Set();

  constructor() {
    super();
  }

  authenticateStrict(req, res) {
    const token = req.cookies?.token;
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

  authenticateLoose(req) {
    const token = req.cookies?.token;
    if (!token) return null;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.handle;
    } catch (err) {
      return null;
    }
  }

  static hasActiveClients() {
    return this._clients.size > 0;
  }

  static async addClient(res) {
    if (res) {
      this._clients.add(res);
      res.on("close", () => {
        this.removeClient(res);
      });
    }
    this._listeners.add(res.handle);
    await AccountModelService.updateUserOnlineStatus(res.handle, true);
  }

  static async removeClient(res) {
    res.removeAllListeners("close");
    this._clients.delete(res);
    this._listeners.delete(res.handle);
    await AccountModelService.updateUserOnlineStatus(res.handle, false);
  }

  static getResFromHandle(handle) {
    return Array.from(this._clients).find((res) => res.handle === handle);
  }

  static async changeClientHandle(oldHandle, newHandle) {
    const res = this.getResFromHandle(oldHandle);
    if (res) {
      await this.removeClient(res);
      res.handle = newHandle;
      await this.addClient(res);
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
