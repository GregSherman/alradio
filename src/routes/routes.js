import { Router } from "express";
import StreamClient from "../client/StreamClient.js";
import SongClient from "../client/SongClient.js";
import AccountClient from "../client/AccountClient.js";
import SpotifyClient from "../client/auth_services/SpotifyClient.js";
import LastFMClient from "../client/auth_services/LastFMClient.js";

const router = Router();

// Up Status
router.get("/status", (req, res) => res.json());

// Stream Routes
router.get("/stream", (req, res) => StreamClient.addClientToStream(req, res));
router.get("/listeners", (req, res) => StreamClient.getListeners(req, res));

// Song Routes
router.get("/song/current", (req, res) =>
  SongClient.getCurrentSongMetadata(req, res),
);
router.get("/song/history/:page", (req, res) =>
  SongClient.getSongHistory(req, res),
);
router.get("/song/next", (req, res) => SongClient.getNextSong(req, res));
router.post("/song/submit", (req, res) =>
  SongClient.submitSongRequest(req, res),
);

// Account Routes
router.post("/register", (req, res) => AccountClient.register(req, res));
router.post("/login", (req, res) => AccountClient.login(req, res));
router.post("/logout", (req, res) => AccountClient.logout(req, res));
router.get("/handle", (req, res) =>
  AccountClient.getHandleAndPictureFromToken(req, res),
);
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

// Authorized Services Routes
router.get("/auth/spotify/callback", (req, res) =>
  SpotifyClient.authorize(req, res),
);
router.post("/auth/spotify/add", (req, res) =>
  SpotifyClient.addSongToPlaylist(req, res),
);
router.post("/auth/spotify/unlink", (req, res) =>
  SpotifyClient.removeAuthorization(req, res),
);
router.get("/auth/lastfm/callback", (req, res) =>
  LastFMClient.authorize(req, res),
);

// Admin Routes
router.get("/admin/queue/user", (req, res) =>
  AccountClient.getUserQueue(req, res),
);
router.get("/admin/queue/audio", (req, res) =>
  AccountClient.getAudioQueue(req, res),
);
router.get("/admin/queue/suggestion", (req, res) =>
  AccountClient.getSuggestionQueue(req, res),
);
router.post("/admin/queue/user", (req, res) =>
  AccountClient.editUserQueue(req, res),
);
router.post("/admin/queue/audio", (req, res) =>
  AccountClient.editAudioQueue(req, res),
);
router.post("/admin/queue/suggestion", (req, res) =>
  AccountClient.editSuggestionQueue(req, res),
);
router.post("/admin/skip", (req, res) =>
  AccountClient.skipCurrentSong(req, res),
);

export default router;
