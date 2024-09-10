import express from "express";
import cors from "cors";

import songRoutes from "./routes/routes.js";

import SpotifyService from "./services/spotify.js";
import ProxyService from "./services/proxy.js";
import QueueService from "./services/queue.js";
import SongController from "./controllers/songController.js";
import DatabaseService from "./services/db/DatabaseService.js";
import RequestModelService from "./services/db/RequestModelService.js";
import AccountModelService from "./services/db/AccountModelService.js";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  optionsSuccessStatus: 200,
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(cookieParser());
// serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.json());
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.stack);
  res.status(500).send("Something went wrong.");
});
app.use("/", songRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server is running at http://localhost:${PORT}`);

  // Circumvent youtube ip blocking
  if (process.env.PROXY_LIST_URL) {
    console.log("Using proxies");
    await ProxyService.refreshProxyList();
  }

  // Choose initial songs
  if (process.env.INITIAL_TRACK_IDS) {
    const initialTrackIds = process.env.INITIAL_TRACK_IDS.split(",");
    console.log("Using initial songs:", initialTrackIds);
    for (const trackId of initialTrackIds) {
      QueueService.addToSuggestionQueue(trackId);
    }
  } else {
    console.error(
      "No initial songs provided. Gathering suggested tracks from Spotify instead.",
    );
  }

  await DatabaseService.initialize();
  await RequestModelService.initialize();
  await AccountModelService.initialize();
  await SpotifyService.initialize();
  SongController.initialize();
});
