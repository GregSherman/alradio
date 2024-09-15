import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AccountModelService from "../services/db/AccountModelService.js";
import HistoryModelService from "../services/db/HistoryModelService.js";
import QueueService from "../services/queue.js";
import ClientService from "./ClientService.js";
import SongController from "../controllers/songController.js";
import leoProfanity from "leo-profanity";
import emailValidator from "email-validator";
import StreamClient from "./StreamClient.js";
import ClientManager from "./ClientManager.js";

class AccountClient extends ClientService {
  async register(req, res) {
    let { handle, password, email, ...profileData } = req.body;
    console.log("Attempting to register user with handle:", handle);

    if (!handle) {
      return res.status(400).json({ message: "Handle is required" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    handle = handle.trim().toLowerCase();
    email = email.trim().toLowerCase();

    if (await AccountModelService.isEmailTaken(email)) {
      return res.status(400).json({ message: "Email already in use" });
    }

    if (await AccountModelService.isHandleTaken(handle)) {
      return res.status(400).json({ message: "Handle already in use" });
    }

    if (!/^[a-z0-9]{3,20}$/.test(handle)) {
      return res.status(400).json({
        message: "Handle must be alphanumeric and between 3 and 20 characters",
      });
    }

    if (!emailValidator.validate(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    leoProfanity.loadDictionary();
    if (leoProfanity.check(handle)) {
      return res.status(400).json({ message: "Handle contains profanity" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long" });
    }

    if (password.length > 256) {
      return res
        .status(400)
        .json({ message: "Password must be at most 256 characters long" });
    }

    if (
      !/[a-zA-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[!@#$%^&*]/.test(password)
    ) {
      return res.status(400).json({
        message:
          "Password must contain a letter, number, and special character",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await AccountModelService.addUserProfile({
      handle,
      passwordHash,
      email,
      ...profileData,
    });

    console.log("Registered user with handle:", handle);
    res.status(201).json({ message: "User registered successfully" });
  }

  async login(req, res) {
    let { handle, password } = req.body;
    handle = handle.trim().toLowerCase();
    console.log("Attempting to login user with handle:", handle);

    const passwordMatch = await AccountModelService.authorizeUser(
      handle,
      password,
    );
    if (!passwordMatch) {
      return res.status(401).json({ message: "Incorrect handle or password" });
    }

    const token = jwt.sign({ handle }, process.env.JWT_SECRET);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.ENVIRONMENT === "prod",
      sameSite: "none",
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    });

    const streamId = StreamClient.getOrGenerateStreamId(req, res);
    res.clearCookie("anonymous-stream-id", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.ENVIRONMENT === "prod",
    });
    await ClientManager.changeClientHandle(streamId, handle);
    res.json({});
  }

  async logout(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    console.log("Logging out user with handle:", authHandle);
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.ENVIRONMENT === "prod",
      sameSite: "none",
    });
    const streamId = StreamClient.getOrGenerateStreamId(req, res);
    await ClientManager.changeClientHandle(authHandle, streamId);
    res.json({});
  }

  async getPublicProfile(req, res) {
    let { handle } = req.params;
    const profile = await AccountModelService.getPublicUserProfile(handle);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json(profile);
  }

  async getPrivateProfile(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    const profile = await AccountModelService.getUserProfile(authHandle);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    profile.isPrivate = true;

    res.json(profile);
  }

  async updateProfile(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    let { handle } = req.params;
    handle = handle.trim().toLowerCase();
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
    let { handle } = req.params;
    handle = handle.trim().toLowerCase();
    const page = req.query.page || 1;

    const history = await HistoryModelService.fetchMostRecentlyPlayedTracks(
      page,
      10,
      handle,
    );
    res.json(history);
  }

  async getHandleAndPictureFromToken(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    const profile = await AccountModelService.getUserProfile(authHandle);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json({ handle: profile.handle, avatarUrl: profile.avatarUrl });
  }

  // admin only
  async skipCurrentSong(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    if (!(await AccountModelService.isAdmin(authHandle))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    console.log("ADMIN skipping current song");
    SongController.skipCurrentSong();

    res.json({ message: "Song skipped successfully" });
  }

  async getSuggestionQueue(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    if (!(await AccountModelService.isAdmin(authHandle))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    console.log("ADMIN fetching suggestion queue");
    res.json(QueueService.getSuggestionQueue());
  }

  async getUserQueue(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    if (!(await AccountModelService.isAdmin(authHandle))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    console.log("ADMIN fetching user queue");
    res.json(await QueueService.getUserQueue());
  }

  async getAudioQueue(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    if (!(await AccountModelService.isAdmin(authHandle))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    console.log("ADMIN fetching audio queue");
    res.json(QueueService.getAudioQueue());
  }

  async editUserQueue(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    if (!(await AccountModelService.isAdmin(authHandle))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    console.log("ADMIN editing user queue");
    await QueueService.editUserQueue(req.body);
    res.json({ message: "User queue updated successfully" });
  }

  async editSuggestionQueue(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    if (!(await AccountModelService.isAdmin(authHandle))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    console.log("ADMIN editing suggestion queue");
    QueueService.editSuggestionQueue(req.body);
    res.json({ message: "Suggestion queue updated successfully" });
  }

  async editAudioQueue(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    if (!(await AccountModelService.isAdmin(authHandle))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    console.log("ADMIN editing audio queue");
    QueueService.editAudioQueue(req.body);
    res.json({ message: "Audio queue updated successfully" });
  }
}

export default new AccountClient();
