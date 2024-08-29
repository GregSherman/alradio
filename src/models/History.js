import mongoose from "mongoose";

const HistorySchema = new mongoose.Schema({
  datePlayed: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  trackId: { type: String, required: true },
  userSubmittedId: { type: String, default: null },
});

const History = mongoose.model("History", HistorySchema);
export default History;
