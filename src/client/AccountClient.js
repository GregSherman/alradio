import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AccountModelService from "../services/db/AccountModelService.js";
import HistoryModelService from "../services/db/HistoryModelService.js";
import ClientService from "./ClientService.js";

class AccountClient extends ClientService {
  async register(req, res) {
    const { handle, password, ...profileData } = req.body;
    console.log("Attempting to register user with handle:", handle);

    if (!handle || !password) {
      console.log("Missing handle or password");
      return res
        .status(400)
        .json({ message: "Handle and password are required" });
    }

    const existingUser = await AccountModelService.getPublicUserProfile(handle);
    if (existingUser) {
      console.log("Handle already in use");
      return res.status(400).json({ message: "Handle already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await AccountModelService.addUserProfile({
      handle,
      passwordHash,
      ...profileData,
    });

    console.log("Registered user with handle:", handle);
    res.status(201).json({ message: "User registered successfully" });
  }

  async login(req, res) {
    const { handle, password } = req.body;
    console.log("Attempting to login user with handle:", handle);

    const passwordMatch = await AccountModelService.authorizeUser(
      handle,
      password,
    );
    if (!passwordMatch) {
      console.log("Incorrect username or password");
      return res
        .status(401)
        .json({ message: "Incorrect username or password" });
    }

    const token = jwt.sign({ handle }, process.env.JWT_SECRET);
    console.log("user logged in with handle:", handle);
    res.json({ token });
  }

  async getPublicProfile(req, res) {
    const { handle } = req.params;
    const profile = await AccountModelService.getPublicUserProfile(handle);
    if (!profile) {
      console.log("Profile not found");
      return res.status(404).json({ message: "Profile not found" });
    }
    console.log("Returning public profile for handle:", handle);
    res.json(profile);
  }

  async getPrivateProfile(req, res) {
    const authHandle = this.authenticate(req, res);

    console.log("Fetching profile for handle:", authHandle);

    const profile = await AccountModelService.getUserProfile(authHandle);
    if (!profile) {
      console.log("Profile not found");
      return res.status(404).json({ message: "Profile not found" });
    }

    console.log("Returning profile for handle:", authHandle);
    res.json(profile);
  }

  async updateProfile(req, res) {
    const authHandle = this.authenticate(req, res);
    const { handle } = req.params;
    const updateData = req.body;

    console.log("Updating profile for handle:", handle);

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
    const { handle } = req.params;
    const page = req.query.page || 1;

    console.log("Fetching history for handle:", handle);

    const history = await HistoryModelService.fetchMostRecentlyPlayedTracks(
      page,
      10,
      handle,
    );
    res.json(history);
  }
}

export default new AccountClient();
