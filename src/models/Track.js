import mongoose from "mongoose";

const TrackSchema = new mongoose.Schema({
  album: { type: String },
  artUrl: { type: String },
  artist: { type: String, required: true },
  genres: [{ type: String }],
  playedCount: { type: Number, default: 0 },
  releaseDate: { type: Date },
  title: { type: String, required: true },
  trackId: { type: String, required: true, unique: true },
  urlForPlatform: { type: Map, of: String }, // e.g., { spotify: url, appleMusic: url }
});

const Track = mongoose.model("Track", TrackSchema);
export default Track;
