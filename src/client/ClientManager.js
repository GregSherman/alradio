import AccountModelService from "../services/db/AccountModelService.js";
import LastFMClient from "./auth_services/LastFMClient.js";
import SongController from "../controllers/songController.js";
import { EventEmitter } from "events";

class ClientManager extends EventEmitter {
  constructor() {
    super();
    this._clients = new Set();
    this._listeners = new Map();
  }

  initialize() {
    SongController.on("songStarted", (metadata) =>
      this.changeCurrentSongForClients(metadata),
    );
  }

  async addClient(res) {
    if (res) {
      this._clients.add(res);
      res.on("close", () => {
        this.removeClient(res);
      });
    }

    const timeout = setTimeout(async () => {
      await LastFMClient.scrobbleTrackForUser(
        res.handle,
        SongController.currentSongMetadata,
      );
    }, 30000);

    clearTimeout(this._listeners.get(res.handle)?.timeout);
    this._listeners.set(res.handle, { timeout });
    await AccountModelService.updateUserOnlineStatus(res.handle, true);
    this.emit("clientConnected");
  }

  async removeClient(res) {
    res.removeAllListeners("close");
    this._clients.delete(res);
    clearTimeout(this._listeners.get(res.handle)?.timeout);
    this._listeners.delete(res.handle);
    await AccountModelService.updateUserOnlineStatus(res.handle, false);
    this.emit("clientDisconnected");
  }

  changeCurrentSongForClients(metadata) {
    for (const handle of this._listeners.keys()) {
      const listener = this._listeners.get(handle);
      clearTimeout(listener.timeout);
      if (!metadata?.trackId) continue;

      listener.currentSongId = metadata.trackId;
      listener.timeout = setTimeout(async () => {
        await LastFMClient.scrobbleTrackForUser(handle, metadata);
      }, 30000);
    }
  }

  getResFromHandle(handle) {
    return Array.from(this._clients).find((res) => res.handle === handle);
  }

  async changeClientHandle(oldHandle, newHandle) {
    const res = this.getResFromHandle(oldHandle);
    if (res) {
      await this.removeClient(res);
      res.handle = newHandle;
      await this.addClient(res);
    }
  }

  hasActiveClients() {
    return this._clients.size > 0;
  }
}

export default new ClientManager();
