import ClientService from "./ClientService.js";

class StreamClient extends ClientService {
  listeners = new Set();

  addClientToStream(req, res) {
    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      Connection: "keep-alive",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

    // get the handle from the query params.
    const handle = req.query.handle;

    ClientService._clients.add(res);
    this.listeners.add(handle);
    this.emit("clientConnected");
    res.on("close", () => {
      ClientService._clients.delete(res);
      this.listeners.delete(handle);
      this.emit("clientDisconnected");
    });
  }

  getListeners(req, res) {
    // listener starts with anon followed by 20 numbers is an anonymous listener.
    const listeners = Array.from(this.listeners);
    const loggedInListeners = listeners.filter(
      (listener) => !listener.startsWith("anon"),
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
    const handle = req.query.handle;
    this.listeners.delete(handle);
    res.json({ success: true });
  }
}

export default new StreamClient();
