import jwt from "jsonwebtoken";
import { EventEmitter } from "events";

class ClientService extends EventEmitter {
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

  _clientifyMetadata(metadata) {
    return {
      trackId: metadata?.trackId,
      title: metadata?.title,
      artist: metadata?.artist,
      album: metadata?.album,
      urlForPlatform: metadata?.urlForPlatform,
      artUrl: metadata?.artUrl,
      userSubmittedId: metadata?.userSubmittedId,
      likes: metadata?.likes,
      datePlayed: metadata?.datePlayed,
    };
  }
}

export default ClientService;
