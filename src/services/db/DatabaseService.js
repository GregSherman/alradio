import mongoose from "mongoose";

class DatabaseService {
  constructor() {
    this._mongoUri = process.env.MONGO_URI;
    this._dbName = "ALsDB";
  }

  async initialize() {
    await this._connectWithMongoose();
  }

  async _connectWithMongoose() {
    try {
      await mongoose.connect(this._mongoUri, {
        dbName: this._dbName,
      });
      console.log(`Mongoose connected to ${this._dbName}`);
    } catch (error) {
      console.error("Error connecting to MongoDB with Mongoose:", error);
    }
  }
}

export default new DatabaseService();
