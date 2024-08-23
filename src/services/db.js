import { MongoClient } from "mongodb";

class DatabaseService {
  constructor() {
    this._mongoUri = process.env.MONGO_URI;
    this._dbName = "musicDB";
  }

  async _connect() {
    const client = new MongoClient(this._mongoUri);
    await client.connect();
    this.db = client.db(this._dbName);
  }

  async _getDb() {
    if (!this.db) {
      await this._connect();
    }
    return this.db;
  }

  async getSongMetadata(trackId) {
    console.log("Retrieving metadata for from database for trackid:", trackId);
    const db = await this._getDb();
    const track = await db.collection("tracks").findOne({ trackId });
    return track;
  }

  async saveSongMetadata(metadata) {
    console.log("Saving data to database for trackid:", metadata.trackId);

    // expire after 1 week
    const db = await this._getDb();
    await db
      .collection("tracks")
      .updateOne(
        { trackId: metadata.trackId },
        { $set: metadata },
        { upsert: true },
        { expireAfterSeconds: 604800 },
      );
  }

  async markSongAsPlayed(trackId) {
    console.log("Marking song as played:", trackId);
    const db = await this._getDb();
    await db.collection("tracks").updateOne(
      { trackId },
      {
        $set: { lastPlayed: new Date() },
        $inc: { playedCount: 1 },
      },
    );
  }

  async getRecentlyPlayedSongs(hours) {
    const cutoff = new Date(Date.now() - hours * 3600 * 1000);
    const db = await this._getDb();
    const songs = await db
      .collection("tracks")
      .find({ lastPlayed: { $gte: cutoff } })
      .toArray();
    return songs;
  }

  async getLastPlayedSongs(limit) {
    const db = await this._getDb();
    let songs = await db
      .collection("tracks")
      .find()
      .sort({ lastPlayed: -1 })
      .limit(limit)
      .toArray();
    songs = songs.filter((song) => song.lastPlayed);
    return songs;
  }

  async hasSongBeenPlayedRecently(trackId, hours = 3) {
    const recentlyPlayed = await this.getRecentlyPlayedSongs(hours);
    return recentlyPlayed.some((song) => song.trackId === trackId);
  }
}

export default new DatabaseService();
