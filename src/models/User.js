const bcrypt = require('bcrypt');
const path = require('path');
const { Base } = require('./Base');
const { Device } = require('./Device');
const { Group } = require('./Group');
const { Location } = require('./Location');

/*
{
  _id: "string",
  username: "string",
  passwordHash: "string",
  friends: ["string"],
  notificationTarget: "string",
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

  async setNotificationTarget(target) {
    this.notificationTarget = target;
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

  async deleteLocations() {
    const number = await Location.remove({ userId: this._id }, { multi: true });
    return number;
  }

  async getGroups() {
    const groups = await Group.getByUserId(this._id);
    return groups;
  }

  async getAcceptedGroups() {
    const groups = await this.getGroups();
    return groups.map((group) => group.toPOJO())
      .map((group) => {
        group.accepted = group.members.find((member) => member.userId === this._id).accepted;
        return group;
      });
  }

  async getUsersSharingWith() {
    const groups = await this.getGroups();
    let sharers = [];

    groups.forEach((group) => {
      const members = group.members.filter((member) => member.accepted).map((member) => member.userId);
      sharers = sharers.concat(members);
    });

    const allUsers = await User.getAll();
    sharers = sharers.concat(allUsers.filter((user) => user.friends.includes(this.username)).map((user) => user._id));

    return [...new Set(sharers)];
  }

  async getFriendsAndGroupies() {
    const groups = await this.getGroups();
    let friends = [...this.friends, this.username];

    friends.concat(groups.flatMap((group) => group.members.filter((member) => member.accepted).map((member) => member.username)));

    return [...new Set(friends)];
  }

  static async getByUsername(uname) {
    const user = await this.findOne({ username: uname });
    return user;
  }
}

module.exports.User = User;
