import Account from "../../models/Account.js";

class AccountService {
  // Get a user's public profile
  async getPublicUserProfile(handle) {
    return Account.findOne(
      { handle },
      {
        handle: 1,
        avatarUrl: 1,
        bio: 1,
        favouriteSong: 1,
        location: 1,
        ALThoughts: 1,
        friends: 1,
        publiclyDisplay: 1,
      },
    )
      .lean()
      .exec();
  }

  // get private profile
  async getUserProfile(handle) {
    return Account.findOne({ handle }).lean().exec();
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

  // Add a friend to the user's friends list
  async addFriend(handle, friendId) {
    return Account.updateOne(
      { handle },
      { $push: { friends: { friendId, dateAdded: new Date() } } },
    ).exec();
  }

  // Remove a friend from the user's friends list
  async removeFriend(handle, friendId) {
    return Account.updateOne(
      { handle },
      { $pull: { friends: { friendId } } },
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

export default new AccountService();
