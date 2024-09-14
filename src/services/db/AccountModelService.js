import Account from "../../models/Account.js";
import bcrypt from "bcrypt";
import SongController from "../../controllers/songController.js";
import ClientService from "../../client/ClientService.js";

const PERMISSION_MAP = {
  noRateLimit: ["admin"],
};

class AccountModelService {
  async initialize() {
    SongController.on("songEnded", () => this._incrementListenersPlayCount());
    await this._forceAllUsersOffline();
  }

  async getUserProfile(handle) {
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
        spotifyUserId: 1,

        customizationPreferences: 1,
        email: 1,
        isEmailVerified: 1,
      },
    )
      .lean()
      .exec();
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
        spotifyUserId: 1,
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
    if (isOnline) {
      return Account.updateOne({ handle }, { $set: { isOnline } }).exec();
    } else {
      return Account.updateOne(
        { handle },
        { $set: { isOnline, lastOnline: new Date() } },
      ).exec();
    }
  }

  async updateCustomizationPreferences(handle, preferences) {
    return Account.updateOne(
      { handle },
      { $set: { customizationPreferences: preferences } },
    ).exec();
  }

  async _incrementListenersPlayCount() {
    console.log("Incrementing listener play count");
    ClientService._listeners.forEach(async (handle) => {
      console.log("Incrementing listener play count for:", handle);
      Account.updateOne(
        { handle },
        { $inc: { numberOfSongsListened: 1 } },
      ).exec();
    });
  }

  async _forceAllUsersOffline() {
    Account.updateMany(
      { isOnline: true },
      { $set: { isOnline: false } },
      { $set: { lastOnline: new Date() } },
    ).exec();
  }

  async userHasPermission(handle, permission) {
    const user = await Account.findOne({ handle }, { role: 1 }).exec();
    return PERMISSION_MAP[permission].includes(user.role);
  }

  async addSpotifyTokens(handle, token, refreshToken) {
    return Account.updateOne(
      { handle },
      {
        $set: {
          spotifyAccessToken: token,
          spotifyRefreshToken: refreshToken,
        },
      },
    ).exec();
  }

  async addSpotifyUserId(handle, userId) {
    return Account.updateOne(
      { handle },
      { $set: { spotifyUserId: userId } },
    ).exec();
  }

  async addSpotifyQuickAddPlaylistId(handle, playlistId) {
    return Account.updateOne(
      { handle },
      { $set: { spotifyQuickAddPlaylistId: playlistId } },
    ).exec();
  }

  async getSpotifyTokens(handle) {
    const user = await Account.findOne(
      { handle },
      {
        spotifyAccessToken: 1,
        spotifyRefreshToken: 1,
      },
    ).exec();
    return {
      accessToken: user.spotifyAccessToken,
      refreshToken: user.spotifyRefreshToken,
    };
  }

  async getSpotifyUserId(handle) {
    const user = await Account.findOne({ handle }, { spotifyUserId: 1 }).exec();
    return user.spotifyUserId;
  }

  async getSpotifyQuickAddPlaylistId(handle) {
    const user = await Account.findOne(
      { handle },
      { spotifyQuickAddPlaylistId: 1 },
    ).exec();
    return user.spotifyQuickAddPlaylistId;
  }
}

export default new AccountModelService();
