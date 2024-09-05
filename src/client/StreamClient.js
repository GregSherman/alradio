import AccountModelService from "../services/db/AccountModelService.js";
import ClientService from "./ClientService.js";

class StreamClient extends ClientService {
  async addClientToStream(req, res) {
    // TODO: implement a way to use tokens for existing users
    const handle = req.query.handle;
    // only allow handles that exist in the db or start with "anon" followed by 20 chars
    if (
      !handle ||
      !(
        (await AccountModelService.isHandleTaken(handle)) ||
        (handle.startsWith("anon") && handle.length === 24)
      )
    ) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      Connection: "keep-alive",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

    ClientService.addClient(res, handle);
    this.emit("clientConnected");

    res.on("close", () => {
      ClientService.removeClient(res, handle);
      this.emit("clientDisconnected");
    });
  }

  getListeners(req, res) {
    // listener starts with anon followed by 20 numbers is an anonymous listener.
    const listeners = Array.from(ClientService._listeners);
    const loggedInListeners = listeners.filter(
      (listener) => listener.length <= 20,
    );
    const anonListeners = listeners.filter(
      (listener) => listener.startsWith("anon") && listener.length === 24,
    );
    res.json({
      count: {
        total: listeners.length,
        loggedIn: loggedInListeners.length,
        anonymous: anonListeners.length,
      },
      list: loggedInListeners,
    });
  }

  tuneOut(req, res) {
    // This will remove the listener even if they are still listening in another tab.
    // TODO: find a way to work around this for more accurate listener count
    const handle = req.query.handle;
    const authHandle = this.authenticateLoose(req);

    // Only allow the listener to tune out if they are the same listener
    if (authHandle && authHandle !== handle) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Only allow anonymous listeners to tune themselves out. (It is unlikely an anonymous listener will be able to tune out another anonymous listener)
    if (
      !authHandle &&
      (!handle || handle.length !== 24 || !handle.startsWith("anon"))
    ) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    ClientService.removeClient(null, handle);
    res.json({ success: true });
  }
}

export default new StreamClient();
