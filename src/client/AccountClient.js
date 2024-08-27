import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AccountService from "../services/db/AccountService.js";
import ClientService from "./ClientService.js";

class AccountClient extends ClientService {
  // Register method
  async register(req, res) {
    const { handle, password, ...profileData } = req.body;

    if (!handle || !password) {
      return res
        .status(400)
        .json({ message: "Handle and password are required" });
    }

    const existingUser = await AccountService.getPublicUserProfile(handle);
    if (existingUser) {
      return res.status(400).json({ message: "Handle already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await AccountService.addUserProfile({
      handle,
      passwordHash,
      ...profileData,
    });

    res.status(201).json({ message: "User registered successfully" });
  }

  // Login method
  async login(req, res) {
    const { handle, password } = req.body;

    const user = await AccountService.getPublicUserProfile(handle);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    const token = jwt.sign({ handle: user.handle }, process.env.JWT_SECRET);
    res.json({ token });
  }

  // Get profile method
  async getProfile(req, res) {
    const { handle } = req.params;
    const auth = this.authenticate(req);

    // Check if auth is the id given in the params
    if (auth.handle === handle) {
      const profile = await AccountService.getUserProfile(handle);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } else {
      const profile = await AccountService.getPublicUserProfile(handle);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    }
  }

  // Update profile method
  async updateProfile(req, res) {
    const auth = this.authenticate(req);
    const { id: handle } = req.params;
    const updateData = req.body;

    // Ensure user can only update their own profile
    if (auth.handle !== handle) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const result = await AccountService.updateUserProfile(handle, updateData);
    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: "Update failed" });
    }

    res.json({ message: "Profile updated successfully" });
  }
}

export default new AccountClient();
