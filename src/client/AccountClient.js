import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AccountModelService from "../services/db/AccountModelService.js";
import HistoryModelService from "../services/db/HistoryModelService.js";
import QueueService from "../services/QueueService.js";
import ClientService from "./ClientService.js";
import SongController from "../controllers/SongController.js";
import leoProfanity from "leo-profanity";
import emailValidator from "email-validator";
import StreamClient from "./StreamClient.js";
import ClientManager from "./ClientManager.js";
import { log } from "../utils/logger.js";
import Mailjet from "node-mailjet";

class AccountClient extends ClientService {
  _mailjet = new Mailjet({
    apiKey: process.env.MAILJET_API_KEY,
    apiSecret: process.env.MAILJET_API_SECRET,
  });

  async register(req, res) {
    let { handle, password, email, ...profileData } = req.body;
    log(
      "info",
      `Attempting to register user with handle: ${handle} and email: ${email}`,
      this.constructor.name,
    );

    if (!handle) {
      log(
        "info",
        "Failed to register user: Handle is required",
        this.constructor.name,
      );
      return res.status(400).json({ message: "Handle is required" });
    }

    if (!password) {
      log(
        "info",
        "Failed to register user: Password is required",
        this.constructor.name,
      );
      return res.status(400).json({ message: "Password is required" });
    }

    if (!email) {
      log(
        "info",
        "Failed to register user: Email is required",
        this.constructor.name,
      );
      return res.status(400).json({ message: "Email is required" });
    }

    handle = handle.trim().toLowerCase();
    email = email.trim().toLowerCase();

    if (await AccountModelService.isEmailTaken(email)) {
      log(
        "info",
        "Failed to register user: Email already in use",
        this.constructor.name,
      );
      return res.status(400).json({ message: "Email already in use" });
    }

    if (await AccountModelService.isHandleTaken(handle)) {
      log(
        "info",
        "Failed to register user: Handle already in use",
        this.constructor.name,
      );
      return res.status(400).json({ message: "Handle already in use" });
    }

    if (!/^[a-z0-9]{3,20}$/.test(handle)) {
      log(
        "info",
        "Failed to register user: Handle must be alphanumeric and between 3 and 20 characters",
        this.constructor.name,
      );
      return res.status(400).json({
        message: "Handle must be alphanumeric and between 3 and 20 characters",
      });
    }

    if (!emailValidator.validate(email)) {
      log(
        "info",
        "Failed to register user: Invalid email address",
        this.constructor.name,
      );
      return res.status(400).json({ message: "Invalid email address" });
    }

    leoProfanity.loadDictionary();
    if (leoProfanity.check(handle)) {
      log(
        "info",
        "Failed to register user: Handle contains profanity",
        this.constructor.name,
      );
      return res.status(400).json({ message: "Handle contains profanity" });
    }

    const passwordError = await this._validatePassword(password);
    if (passwordError) {
      log(
        "info",
        `Failed to register user: ${passwordError}`,
        this.constructor.name,
      );
      return res.status(400).json({ message: passwordError });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await AccountModelService.addUserProfile({
      handle,
      passwordHash,
      email,
      ...profileData,
    });
    log(
      "info",
      `Registered user with handle: ${handle}`,
      this.constructor.name,
    );
    res.status(201).json({ message: "User registered successfully" });
  }

  async login(req, res) {
    let { handle, password } = req.body;
    handle = handle.trim().toLowerCase();
    log(
      "info",
      `Attempting to login user with handle: ${handle}`,
      this.constructor.name,
    );

    const passwordMatch = await AccountModelService.authorizeUser(
      handle,
      password,
    );
    if (!passwordMatch) {
      log(
        "info",
        `Failed to login user with handle: ${handle}. Incorrect handle or password`,
        this.constructor.name,
      );
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
    log("info", `Logged in user with handle: ${handle}`, this.constructor.name);
  }

  async logout(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    log(
      "info",
      `Logging out user with handle: ${authHandle}`,
      this.constructor.name,
    );
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.ENVIRONMENT === "prod",
      sameSite: "none",
    });
    const streamId = StreamClient.getOrGenerateStreamId(req, res);
    await ClientManager.changeClientHandle(authHandle, streamId);
    res.json({});
  }

  async forgotPassword(req, res) {
    let { email } = req.body;

    log(
      "info",
      `Attempting to reset password for email: ${email}`,
      this.constructor.name,
    );

    email = email.trim().toLowerCase();
    if (!emailValidator.validate(email)) {
      log(
        "info",
        "Failed to reset password: Invalid email address",
        this.constructor.name,
      );
      return res.status(400).json({ message: "Invalid email address" });
    }

    const { passwordResetToken } =
      await AccountModelService.generatePasswordResetToken(email);

    if (!passwordResetToken) {
      log(
        "info",
        `Failed to reset password for email: ${email}. Email not found`,
        this.constructor.name,
      );
      return res.status(404).json({ message: "Email not found" });
    }

    const request = this._mailjet.post("send").request({
      FromEmail: "als-assistant@alradio.live",
      FromName: "AL's Assistant",
      Subject: "AL Radio Password Reset",
      "Text-part": `Use this code to reset your password: ${passwordResetToken}`,
      "Html-part": `Use this code to reset your password: <b>${passwordResetToken}</b>`,
      Recipients: [{ Email: email }],
    });

    request
      .then(() => {
        log(
          "info",
          `Password reset email sent to: ${email}`,
          this.constructor.name,
        );
        res.json({
          message:
            "An email has been sent with instructions to reset your password",
        });
      })
      .catch((err) => {
        log(
          "info",
          `Failed to send password reset email to: ${email}. ${err}`,
          this.constructor.name,
        );
        res
          .status(500)
          .json({ message: "Failed to send password reset email" });
      });
  }

  async changePassword(req, res) {
    let { email, password, code } = req.body;

    log(
      "info",
      `Attempting to change password for email: ${email}`,
      this.constructor.name,
    );

    email = email.trim().toLowerCase();

    const user = await AccountModelService.getUserByEmail(email);

    if (!user) {
      log(
        "info",
        `Failed to change password for email: ${email}. Email not found`,
        this.constructor.name,
      );
      return res.status(404).json({ message: "Email not found" });
    }

    if (
      user.passwordResetToken !== code ||
      user.passwordResetTokenExpiration < new Date()
    ) {
      log(
        "info",
        `Failed to change password for email: ${email}. Invalid or expired password reset token`,
        this.constructor.name,
      );
      return res
        .status(400)
        .json({ message: "Invalid or expired password reset token" });
    }

    const passwordError = await this._validatePassword(password);
    if (passwordError) {
      log(
        "info",
        `Failed to register user: ${passwordError}`,
        this.constructor.name,
      );
      return res.status(400).json({ message: passwordError });
    }

    await AccountModelService.updatePassword(user.handle, password);
    res.json({ message: "Password changed successfully" });
    AccountModelService.removePasswordResetToken(email);
  }

  async getPublicProfile(req, res) {
    let { handle } = req.params;
    log(
      "info",
      `Fetching public profile for handle: ${handle}`,
      this.constructor.name,
    );
    const profile = await AccountModelService.getPublicUserProfile(handle);
    if (!profile) {
      log(
        "info",
        `Failed to fetch public profile for handle: ${handle}. Profile not found`,
        this.constructor.name,
      );
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json(profile);
  }

  async getPrivateProfile(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    log(
      "info",
      `Fetching private profile for handle: ${authHandle}`,
      this.constructor.name,
    );

    const profile = await AccountModelService.getUserProfile(authHandle);
    if (!profile) {
      log(
        "info",
        `Failed to fetch private profile for handle: ${authHandle}. Profile not found`,
        this.constructor.name,
      );
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

    log(
      "info",
      `Attempting to update profile for handle: ${handle}`,
      this.constructor.name,
    );

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
    let { handle, page } = req.params;
    handle = handle.trim().toLowerCase();

    page = parseInt(page);
    if (isNaN(page) || page < 1) {
      log(
        "info",
        `Failed to fetch history for handle: ${handle}. Invalid page number: ${page}`,
        this.constructor.name,
      );
      return res.status(400).json({ message: "Invalid page number" });
    }

    log(
      "info",
      `Fetching history for handle: ${handle}`,
      this.constructor.name,
    );
    const history = await HistoryModelService.fetchMostRecentlyPlayedTracks(
      page,
      10,
      handle,
    );
    const isLastPage = await HistoryModelService.isLastPage(page, 10, handle);
    const numberOfPages = await HistoryModelService.countNumberOfPages(
      10,
      handle,
    );
    res.json({ tracks: history, isLastPage, numberOfPages });
  }

  async getHandleAndPictureFromToken(req, res) {
    const authHandle = this.authenticateStrict(req, res);
    if (!authHandle) {
      return;
    }

    log(
      "info",
      `Fetching handle and picture for token: ${authHandle}`,
      this.constructor.name,
    );

    const profile = await AccountModelService.getUserProfile(authHandle);
    if (!profile) {
      log(
        "info",
        `Failed to fetch handle and picture for token: ${authHandle}. Profile not found`,
        this.constructor.name,
      );
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

    log(
      "info",
      `Admin ${authHandle} skipping current song`,
      this.constructor.name,
    );
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
    log(
      "info",
      `Admin ${authHandle} fetching suggestion queue`,
      this.constructor.name,
    );
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

    log(
      "info",
      `Admin ${authHandle} fetching user queue`,
      this.constructor.name,
    );
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

    log(
      "info",
      `Admin ${authHandle} fetching audio queue`,
      this.constructor.name,
    );
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

    log(
      "info",
      `Admin ${authHandle} editing user queue`,
      this.constructor.name,
    );
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

    log(
      "info",
      `Admin ${authHandle} editing suggestion queue`,
      this.constructor.name,
    );
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

    log(
      "info",
      `Admin ${authHandle} editing audio queue`,
      this.constructor.name,
    );
    QueueService.editAudioQueue(req.body);
    res.json({ message: "Audio queue updated successfully" });
  }

  async _validatePassword(password) {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }

    if (password.length > 256) {
      return "Password must be at most 256 characters long";
    }

    if (
      !/[a-zA-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[!@#$%^&*]/.test(password)
    ) {
      return "Password must contain a letter, number, and special character";
    }
  }
}

export default new AccountClient();
