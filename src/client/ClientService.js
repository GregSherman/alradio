import EventEmitter from "events";
import jwt from "jsonwebtoken";

class ClientService extends EventEmitter {
  static _clients = new Set();

  constructor() {
    super();
  }

  authenticate(req) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) throw new Error("Unauthorized");

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.handle;
    } catch (err) {
      throw new Error("Invalid Token");
    }
  }

  static hasActiveClients() {
    return this._clients.size > 0;
  }

  _clientifyMetadata(metadata) {
    return {
      trackId: metadata.trackId,
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      urlForPlatform: metadata.urlForPlatform,
      artUrl: metadata.artUrl,
    };
  }
}

export default ClientService;
