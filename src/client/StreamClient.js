import ClientManager from "./ClientManager.js";
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

    console.log("Adding client to stream:", handle);
    ClientManager.addClient(res);
  }

  async getListeners(req, res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendListenersData = () => {
      const listeners = Array.from(ClientManager._listeners.keys());
      const loggedInListeners = listeners.filter(
        (listener) => !listener.startsWith("anonymous-listener"),
      );
      const anonListeners = listeners.filter((listener) =>
        listener.startsWith("anonymous-listener"),
      );

      const listenerData = {
        count: {
          total: listeners.length,
          loggedIn: loggedInListeners.length,
          anonymous: anonListeners.length,
        },
        list: loggedInListeners,
      };
      res.write(`data: ${JSON.stringify(listenerData)}\n\n`);
    };

    sendListenersData();
    const clientConnectedListener = () => {
      sendListenersData();
    };

    ClientManager.on("clientConnected", clientConnectedListener);
    ClientManager.on("clientDisconnected", clientConnectedListener);
    console.log(
      "clientConnected listener count:",
      ClientManager.listenerCount("clientConnected"),
    );
    req.on("close", () => {
      ClientManager.off("clientConnected", clientConnectedListener);
      ClientManager.off("clientDisconnected", clientConnectedListener);
      res.end();
    });

    req.on("error", () => {
      ClientManager.off("clientConnected", clientConnectedListener);
      ClientManager.off("clientDisconnected", clientConnectedListener);
      res.end();
    });
  }
}

export default new StreamClient();
