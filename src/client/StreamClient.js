import ClientService from "./ClientService.js";

class StreamClient extends ClientService {
  addClientToStream(req, res) {
    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      Connection: "keep-alive",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

    const handle = req.query.handle;
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
    ClientService.removeClient(null, handle);
    res.json({ success: true });
  }
}

export default new StreamClient();
