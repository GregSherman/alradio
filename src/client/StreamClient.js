import ClientService from "./ClientService.js";

class StreamClient extends ClientService {
  _getStreamId(req, res) {
    let handle = this.authenticateLoose(req);
    if (!handle) {
      handle =
        req.cookies["anonymous-stream-id"] ||
        `anonymous-listener-${Math.random().toString(36)}`;
      res.cookie("anonymous-stream-id", handle, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.ENVIRONMENT === "prod",
      });
    }
    return handle;
  }

  async addClientToStream(req, res) {
    let handle = this._getStreamId(req, res);

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
      console.log("disconnected: ", ClientService._listeners);
    });
  }

  getListeners(req, res) {
    const listeners = Array.from(ClientService._listeners);
    const loggedInListeners = listeners.filter(
      (listener) => !listener.startsWith("anonymous-listener"),
    );
    const anonListeners = listeners.filter((listener) =>
      listener.startsWith("anonymous-listener"),
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
}

export default new StreamClient();
