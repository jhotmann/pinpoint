const bcrypt = require('bcrypt');
const path = require('path');
const { Base } = require('./Base');
const { Device } = require('./Device');
const { Group } = require('./Group');

/*
{
  _id: "string",
  username: "string",
  passwordHash: "string",
  friends: ["string"],
  createdAt: Date,
  updatedAt: Date,
}
*/

class User extends Base {
  static datastore() {
    return {
      filename: path.join('data', 'users.db'),
      timestampData: true,
    };
  }

  static async create(username, password) {
    const existing = await User.findOne({ username });
    if (existing) return null;
    const passwordHash = await bcrypt.hash(password, 15);
    const user = new User({ username, passwordHash, friends: [], isAdmin: false });
    await user.save();
    return user;
  }

  async refresh() {
    const user = await User.get(this._id);
    return user;
  }

  async setFriends(friendsArray) {
    this.friends = friendsArray || [];
    if (typeof friendsArray === 'string') this.friends = [friendsArray];
    const user = await this.save();
    return user;
  }

  async dismissHelp() {
    this.helpDismissed = true;
    const user = await this.save();
    return user;
  }

  async setIsAdmin(admin) {
    this.isAdmin = admin;
    const user = await this.save();
    return user;
  }

  async setPasswordHash(passwordHash) {
    this.passwordHash = passwordHash;
    const user = await this.save();
    return user;
  }

  async getDevices() {
    const devices = await Device.getByUserId(this._id);
    return devices;
  }

  async deleteDevices() {
    const number = await Device.remove({ userId: this._id }, { multi: true });
    return number;
  }

  async getGroups() {
    const groups = await Group.getByUserId(this._id);
    return groups;
  }

  static async getByUsername(uname) {
    const user = await this.findOne({ username: uname });
    return user;
  }
}

module.exports.User = User;
