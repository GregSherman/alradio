import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AccountModelService from "../services/db/AccountModelService.js";
import HistoryModelService from "../services/db/HistoryModelService.js";
import ClientService from "./ClientService.js";

class AccountClient extends ClientService {
  async register(req, res) {
    const { handle, password, ...profileData } = req.body;

    if (!handle || !password) {
      return res
        .status(400)
        .json({ message: "Handle and password are required" });
    }

    const existingUser = await AccountModelService.getPublicUserProfile(handle);
    if (existingUser) {
      return res.status(400).json({ message: "Handle already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await AccountModelService.addUserProfile({
      handle,
      passwordHash,
      ...profileData,
    });

    res.status(201).json({ message: "User registered successfully" });
  }

  async login(req, res) {
    const { handle, password } = req.body;

    const passwordMatch = await AccountModelService.authorizeUser(
      handle,
      password,
    );
    if (!passwordMatch) {
      return res
        .status(401)
        .json({ message: "Incorrect username or password" });
    }

    const token = jwt.sign({ handle }, process.env.JWT_SECRET);
    res.json({ token });
  }

  async getProfile(req, res) {
    const { handle } = req.params;
    const authHandle = this.authenticate(req, res);
    if (!authHandle) {
      return;
    }

    if (authHandle === handle) {
      const profile = await AccountModelService.getUserProfile(handle);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } else {
      const profile = await AccountModelService.getPublicUserProfile(handle);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    }
  }

  async updateProfile(req, res) {
    const authHandle = this.authenticate(req, res);
    const { handle } = req.params;
    const updateData = req.body;

    if (authHandle !== handle) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const validFields = ["avatarUrl", "bio", "location", "favouriteSong"];
    for (const field in updateData) {
      if (!validFields.includes(field)) {
        return res.status(400).json({ message: "Invalid field: " + field });
      }
    }
    const result = await AccountModelService.updateUserProfile(
      handle,
      updateData,
    );
    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: "Update failed" });
    }

    res.json({ message: "Profile updated successfully" });
  }

  async getHistory(req, res) {
    const { handle } = req.params;
    const page = req.query.page || 1;

    const history = await HistoryModelService.fetchMostRecentlyPlayedTracks(
      page,
      10,
      handle,
    );
    res.json(history);
  }

  async addFriend(req, res) {
    const { handle } = req.params;
    const authHandle = this.authenticate(req, res);
    if (!authHandle) {
      return;
    }

    if (authHandle === handle) {
      return res
        .status(400)
        .json({ message: "Cannot add yourself as a friend" });
    }

    const user = await AccountModelService.getPublicUserProfile(handle);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await AccountModelService.addFriend(authHandle, handle);
    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: "Failed to add friend" });
    }

    res.json({ message: "Friend added successfully" });
  }
}

export default new AccountClient();
