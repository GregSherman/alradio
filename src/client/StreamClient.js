import EventService from "../services/EventService.js";
import { log } from "../utils/logger.js";
import ClientManager from "./ClientManager.js";
import ClientService from "./ClientService.js";

class StreamClient extends ClientService {
  getOrGenerateStreamId(req, res) {
    log("info", "Generating stream ID", this.constructor.name);
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
    log("info", `Adding client to stream: ${handle}`, this.constructor.name);
    ClientManager.addClient(res);
  }

  async getListeners(req, res) {
    log("info", "Creating listeners event stream", this.constructor.name);
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
      log("info", "Listeners data sent", req.taskId, this.constructor.name);
    };

    sendListenersData();
    const clientConnectedListener = () => {
      sendListenersData();
    };

    EventService.onWithClientContext(
      "clientConnected",
      clientConnectedListener,
    );
    EventService.onWithClientContext(
      "clientDisconnected",
      clientConnectedListener,
    );
    req.on("close", () => {
      EventService.off("clientConnected", clientConnectedListener);
      EventService.off("clientDisconnected", clientConnectedListener);
      res.end();
      log("info", "Listeners stream closed", req.taskId, this.constructor.name);
    });

    req.on("error", () => {
      log("info", "Listeners stream error", req.taskId, this.constructor.name);
    });
  }
}

export default new StreamClient();
