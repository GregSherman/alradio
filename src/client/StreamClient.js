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

    ClientService._clients.add(res);
    this.emit("clientConnected");
    res.on("close", () => {
      ClientService._clients.delete(res);
      this.emit("clientDisconnected");
    });
  }

  getListeners(req, res) {
    res.json({ count: ClientService._clients.size });
  }
}

export default new StreamClient();
