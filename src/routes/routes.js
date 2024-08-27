import { Router } from "express";
import StreamClient from "../client/StreamClient.js";
import SongClient from "../client/SongClient.js";
import AccountClient from "../client/AccountClient.js";

const router = Router();

// Stream Routes
router.get("/stream", (req, res) => StreamClient.addClientToStream(req, res));
router.get("/listeners", (req, res) => StreamClient.getListeners(req, res));

// Song Routes
router.get("/song/current", (req, res) =>
  SongClient.getCurrentSongMetadata(req, res),
);
router.get("/song/history", (req, res) => SongClient.getSongHistory(req, res));
router.get("/song/next", (req, res) => SongClient.getNextSong(req, res));
router.post("/song/submit", (req, res) =>
  SongClient.submitSongRequest(req, res),
);

// Account Routes
router.post("/register", (req, res) => AccountClient.register(req, res));
router.post("/login", (req, res) => AccountClient.login(req, res));
router.get("/accounts", (req, res) =>
  AccountClient.getPrivateProfile(req, res),
);
router.post("/accounts", (req, res) => AccountClient.updateProfile(req, res));
router.get("/accounts/:handle", (req, res) =>
  AccountClient.getPublicProfile(req, res),
);
router.get("/accounts/:handle/history", (req, res) =>
  AccountClient.getHistory(req, res),
);

export default router;
