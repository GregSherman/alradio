import { Router } from "express";
import StreamClient from "../client/StreamClient.js";
import SongClient from "../client/SongClient.js";
import AccountClient from "../client/AccountClient.js";
import FriendClient from "../client/FriendClient.js";

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
router.post("/accounts/login", (req, res) => AccountClient.login(req, res));
router.post("/accounts/register", (req, res) =>
  AccountClient.register(req, res),
);
router.get("/accounts/logout", (req, res) => AccountClient.logout(req, res));
router.get("/accounts/:handle", (req, res) =>
  AccountClient.getProfile(req, res),
);
router.post("/accounts/:handle", (req, res) =>
  AccountClient.updateProfile(req, res),
);

// Friends Routes
router.get("/accounts/friends", (req, res) =>
  FriendClient.getFriends(req, res),
);
router.post("/accounts/friends/add/:handle", (req, res) =>
  FriendClient.addFriend(req, res),
);

export default router;
