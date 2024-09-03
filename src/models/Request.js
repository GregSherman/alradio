import mongoose from "mongoose";

const RequestSchema = new mongoose.Schema({
  dateRequested: { type: Date, default: Date.now },
  trackId: { type: String, required: true },
  userSubmittedId: { type: String, required: true },
  historyEntryId: { type: String, default: null },
  playStatus: { type: String, default: "requested" },
});

const History = mongoose.model("Request", RequestSchema);
export default History;
