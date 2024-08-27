import mongoose from "mongoose";

const AccountSchema = new mongoose.Schema({
  ALThoughts: { type: String, default: "" },
  avatarUrl: { type: String, default: "" },
  bio: { type: String, default: "" },
  createdDate: { type: Date, default: Date.now },
  customizationPreferences: { type: Map, of: String }, // e.g., { theme: "vaporTeal", windowPositions: {audioPlayer: {x: 50, y: 100}} }
  favouriteSong: { type: String, default: "" },
  friends: [{ friendId: String, dateAdded: Date }],
  handle: { type: String, required: true, unique: true },
  isOnline: { type: Boolean, default: false },
  lastOnline: { type: Date, default: Date.now },
  linkedServices: { type: Map, of: String }, // e.g., { spotify: url, appleMusic: url }
  location: { type: String, default: "" },
  numberOfSongsListened: { type: Number, default: 0 },
  passwordHash: { type: String, required: true },
  publiclyDisplay: { type: Map, of: Boolean }, // e.g., { location: true, linkedServices: false }
  serviceTokens: { type: Map, of: String }, // e.g., { spotify: token, appleMusic: token }
});

const Account = mongoose.model("Account", AccountSchema);
export default Account;
