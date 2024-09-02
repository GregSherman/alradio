import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AccountModelService from "../services/db/AccountModelService.js";
import HistoryModelService from "../services/db/HistoryModelService.js";
import QueueService from "../services/queue.js";
import ClientService from "./ClientService.js";
import SongController from "../controllers/songController.js";
import leoProfanity from "leo-profanity";
import emailValidator from "email-validator";

class AccountClient extends ClientService {
  async register(req, res) {
    let { handle, password, email, ...profileData } = req.body;
    console.log("Attempting to register user with handle:", handle);

    if (!handle) {
      console.log("Handle is required");
      return res.status(400).json({ message: "Handle is required" });
    }

    if (!password) {
      console.log("Password is required");
      return res.status(400).json({ message: "Password is required" });
    }

    if (!email) {
      console.log("Email is required");
      return res.status(400).json({ message: "Email is required" });
    }

    handle = handle.trim().toLowerCase();
    email = email.trim().toLowerCase();

    if (await AccountModelService.isEmailTaken(email)) {
      console.log("Email already in use: ", email);
      return res.status(400).json({ message: "Email already in use" });
    }

    if (await AccountModelService.isHandleTaken(handle)) {
      console.log("Handle already in use: ", handle);
      return res.status(400).json({ message: "Handle already in use" });
    }

    if (!/^[a-z0-9]{3,20}$/.test(handle)) {
      console.log(
        "Handle must be alphanumeric and between 3 and 20 characters: ",
        handle,
      );
      return res.status(400).json({
        message: "Handle must be alphanumeric and between 3 and 20 characters",
      });
    }

    if (!emailValidator.validate(email)) {
      console.log("Invalid email address: ", email);
      return res.status(400).json({ message: "Invalid email address" });
    }

    leoProfanity.loadDictionary();
    if (leoProfanity.check(handle)) {
      console.log("Handle contains profanity:", handle);
      return res.status(400).json({ message: "Handle contains profanity" });
    }

    if (password.length < 8) {
      console.log("Password must be at least 8 characters long");
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long" });
    }

    if (password.length > 256) {
      console.log("Password must be at most 256 characters long");
      return res
        .status(400)
        .json({ message: "Password must be at most 256 characters long" });
    }

    if (
      !/[a-zA-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[!@#$%^&*]/.test(password)
    ) {
      console.log(
        "Password must contain a letter, number, and special character",
      );
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
      console.log("Incorrect handle or password");
      return res.status(401).json({ message: "Incorrect handle or password" });
    }

    const token = jwt.sign({ handle }, process.env.JWT_SECRET);
    console.log("user logged in with handle:", handle);
    res.json({ token });
  }

  async getPublicProfile(req, res) {
    let { handle } = req.params;
    const profile = await AccountModelService.getPublicUserProfile(handle);
    if (!profile) {
      console.log("Profile not found");
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json(profile);
  }

  async getPrivateProfile(req, res) {
    const authHandle = this.authenticate(req, res);
    if (!authHandle) {
      return;
    }

    const profile = await AccountModelService.getUserProfile(authHandle);
    if (!profile) {
      console.log("Profile not found");
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  }

  async updateProfile(req, res) {
    const authHandle = this.authenticate(req, res);
    let { handle } = req.params;
    handle = handle.trim().toLowerCase();
    const updateData = req.body;

    if (authHandle !== handle) {
      console.log("Cannot update another user's profile");
      return res.status(403).json({ message: "Forbidden" });
    }

    const validFields = ["avatarUrl", "bio", "location", "favouriteSong"];
    for (const field in updateData) {
      if (!validFields.includes(field)) {
        console.log("Invalid field:", field);
        return res.status(400).json({ message: "Invalid field: " + field });
      }
    }
    const result = await AccountModelService.updateUserProfile(
      handle,
      updateData,
    );
    if (result.modifiedCount === 0) {
      console.log("Update failed");
      return res.status(400).json({ message: "Update failed" });
    }

    console.log("Profile updated successfully");
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
    const authHandle = this.authenticate(req, res);
    if (!authHandle) {
      return;
    }

    const profile = await AccountModelService.getUserProfile(authHandle);
    if (!profile) {
      console.log("Profile not found");
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json({ handle: profile.handle, avatarUrl: profile.avatarUrl });
  }

  // admin only
  async skipCurrentSong(req, res) {
    const authHandle = this.authenticate(req, res);
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
    const authHandle = this.authenticate(req, res);
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
    const authHandle = this.authenticate(req, res);
    if (!authHandle) {
      return;
    }

    if (!(await AccountModelService.isAdmin(authHandle))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    console.log("ADMIN fetching user queue");
    res.json(QueueService.getUserQueue());
  }

  async getAudioQueue(req, res) {
    const authHandle = this.authenticate(req, res);
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
    const authHandle = this.authenticate(req, res);
    if (!authHandle) {
      return;
    }

    if (!(await AccountModelService.isAdmin(authHandle))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    console.log("ADMIN editing user queue");
    QueueService.editUserQueue(req.body);
    res.json({ message: "User queue updated successfully" });
  }

  async editSuggestionQueue(req, res) {
    const authHandle = this.authenticate(req, res);
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
    const authHandle = this.authenticate(req, res);
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
