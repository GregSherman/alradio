import ClientService from "./ClientService.js";

class StreamClient extends ClientService {
  getOrGenerateStreamId(req, res) {
    if (!req.cookies["anonymous-stream-id"]) {
      const streamId = `anonymous-listener-${Math.random().toString(36)}`;
      res.cookie("anonymous-stream-id", streamId, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.ENVIRONMENT === "prod",
      });
      return streamId;
    }
    return req.cookies["anonymous-stream-id"];
  }

  async addClientToStream(req, res) {
    let handle =
      this.authenticateLoose(req) || this.getOrGenerateStreamId(req, res);

    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      Connection: "keep-alive",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

    res.handle = handle;

    ClientService.addClient(res);
    this.emit("clientConnected");
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
