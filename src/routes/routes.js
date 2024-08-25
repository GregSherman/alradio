import { Router } from "express";
import ClientService from "../services/client.js";
const router = Router();

router.get("/stream", (req, res) => ClientService.addClientToStream(req, res));
router.get("/song", (req, res) =>
  ClientService.getCurrentSongMetadata(req, res),
);
router.get("/history", (req, res) => ClientService.getSongHistory(req, res));
router.get("/next", (req, res) => ClientService.getNextSong(req, res));
router.get("/listeners", (req, res) => ClientService.getListeners(req, res));
router.get("/speedtest", (req, res) => {
  res.sendFile("test.png", { root: "./public" });
});

router.post("/submit", (req, res) => ClientService.submitSongRequest(req, res));

export default router;
