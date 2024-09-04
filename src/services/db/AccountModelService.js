import Account from "../../models/Account.js";
import bcrypt from "bcrypt";
import SongController from "../../controllers/songController.js";
import ClientService from "../../client/ClientService.js";

const PERMISSION_MAP = {
  noRateLimit: ["admin"],
};

class AccountModelService {
  async initialize() {
    SongController.on("songEnded", () => this._incrementListenersPlayCount);
    await this._forceAllUsersOffline();
  }

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

  async updateUserProfile(handle, updateData) {
    return Account.updateOne({ handle }, { $set: updateData }).exec();
  }

  async addUserProfile(profileData) {
    const newAccount = new Account(profileData);
    return newAccount.save();
  }

  async updateUserAvatar(handle, avatarUrl) {
    return Account.updateOne({ handle }, { $set: { avatarUrl } }).exec();
  }

  async updateUserOnlineStatus(handle, isOnline) {
    return Account.updateOne(
      { handle },
      { $set: { isOnline, lastOnline: isOnline ? null : new Date() } },
    ).exec();
  }

  async updateCustomizationPreferences(handle, preferences) {
    return Account.updateOne(
      { handle },
      { $set: { customizationPreferences: preferences } },
    ).exec();
  }

  async _incrementListenersPlayCount() {
    ClientService._listeners.forEach(async (handle) => {
      await Account.updateOne(
        { handle },
        { $inc: { numberOfSongsListened: 1 } },
      ).exec();
    });
  }

  async _forceAllUsersOffline() {
    Account.updateMany(
      { isOnline: true },
      { $set: { isOnline: false } },
    ).exec();
  }

  async userHasPermission(handle, permission) {
    const user = await Account.findOne({ handle }, { role: 1 }).exec();
    return PERMISSION_MAP[permission].includes(user.role);
  }
}

export default new AccountModelService();
