import Account from "../../models/Account.js";
import bcrypt from "bcrypt";

class AccountModelService {
  // Get a user's public profile
  async getPublicUserProfile(handle) {
    return Account.findOne(
      { handle },
      {
        ALThoughts: 1,
        avatarUrl: 1,
        bio: 1,
        createdDate: 1,
        favouriteSong: 1,
        friends: 1,
        handle: 1,
        isOnline: 1,
        lastOnline: 1,
        location: 1,
        numberOfSongsListened: 1,
        role: 1,
      },
    )
      .lean()
      .exec();
  }

  async isEmailTaken(email) {
    return Account.exists({ email });
  }

  async isHandleTaken(handle) {
    return Account.exists({ handle });
  }

  async isAdmin(handle) {
    const user = await Account.findOne({ handle }, { role: 1 }).exec();
    return user.role === "admin";
  }

  // Get private profile
  async getUserProfile(handle) {
    return Account.findOne({ handle }, { passwordHash: 0, _id: 0 })
      .lean()
      .exec();
  }

  async authorizeUser(handle, password) {
    const user = await Account.findOne({ handle }).exec();
    if (!user) {
      return false;
    }
    return bcrypt.compare(password, user.passwordHash);
  }

  // Update a user's profile
  async updateUserProfile(handle, updateData) {
    return Account.updateOne({ handle }, { $set: updateData }).exec();
  }

  // Add a new user profile
  async addUserProfile(profileData) {
    const newAccount = new Account(profileData);
    return newAccount.save();
  }

  // Update the user's avatar
  async updateUserAvatar(handle, avatarUrl) {
    return Account.updateOne({ handle }, { $set: { avatarUrl } }).exec();
  }

  // Update the user's online status
  async updateUserStatus(handle, isOnline) {
    return Account.updateOne(
      { handle },
      { $set: { isOnline, lastOnline: isOnline ? null : new Date() } },
    ).exec();
  }

  // Update the user's customization preferences
  async updateCustomizationPreferences(handle, preferences) {
    return Account.updateOne(
      { handle },
      { $set: { customizationPreferences: preferences } },
    ).exec();
  }

  // Increment the number of songs the user has listened to
  async incrementSongsListened(handle) {
    return Account.updateOne(
      { handle },
      { $inc: { numberOfSongsListened: 1 } },
    ).exec();
  }
}

export default new AccountModelService();
