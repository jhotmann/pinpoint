const async = require('async');
const bcrypt = require('bcrypt');
const cryptoRandomString = require('crypto-random-string');
const { DataTypes, Op } = require('sequelize');
const Base = require('./base');
const { Friend } = require('./friend');
const { Device } = require('./device');
const { Location } = require('./location');
const { Share } = require('./share');

class User extends Base {
  static async createNew(username, password) {
    const existing = await User.findOne({ where: { username } });
    if (existing) return null;
    const passwordHash = await bcrypt.hash(password, 15);
    const user = await this.create({ username, passwordHash });
    return user;
  }

  static async getByUsername(username, options) {
    if (!options) options = {};
    const defaultOptions = { where: { username } };
    const existing = await User.findOne({ ...defaultOptions, ...options });
    return existing;
  }

  async delete() {
    await Device.destroy({ where: { userId: this.id } });
    await Location.destroy({ where: { userId: this.id } });
    await Share.destroy({ where: { userId: this.id } });
    // TODO how to handle groups?
    await this.destroy();
  }

  async setFriends(friends) {
    if (typeof friends === 'string') friends = [friendsArray];
    await Friend.destroy({ where: { userId: this.id } } );
    await async.each(friends, async (f) => {
      console.log(`Adding ${f} as a friend`);
      const friend = await User.getByUsername(f);
      await Friend.create({ userId: this.id, friendId: friend.id });
    });
  }

  async getDevicesSharingWith() {
    const userDevices = await this.getDevices();
    const deviceIds = userDevices.map((d) => d.id);

    const sharers = await Friend.findAll({ where: { friendId: this.id }, attributes: ['userId'] });
    const sharerIds = sharers.map((s) => s.userId).flat();
    const sharingUsers = await User.findAll({ where: { id: { [Op.in]: sharerIds } } });
    await async.each(sharingUsers, async (sharer) => {
      const devices = await sharer.getDevices();
      devices.forEach((device) => {
        if (!deviceIds.includes(device.id)) deviceIds.push(device.id);
      });
    });

    const groups = await this.getGroups();
    const groupieIds = [];
    const groupies = [];
    await async.each(groups, async (g) => {
      const members = await g.getMembers();
      members.forEach((member) => {
        if (groupieIds.includes(member.id)) return;
        if (member?.GroupMembers?.accepted) {
          groupieIds.push(member.id);
          groupies.push(member);
        }
      });
    });
    
    await async.each(groupies, async (sharer) => {
      const devices = await sharer.getDevices();
      devices.forEach((device) => {
        if (!deviceIds.includes(device.id)) deviceIds.push(device.id);
      });
    });
    return deviceIds;
  }
}

const dataStructure = {
  uuid: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    defaultValue: () => {
      return cryptoRandomString({ length: 20, type: 'alphanumeric' });
    },
    set(value) {
      if (!value) value = cryptoRandomString({ length: 20, type: 'alphanumeric' });
      this.setDataValue('uuid', value);
    } 
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  passwordHash: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notificationTarget: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  helpDismissed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
};

module.exports = { User, dataStructure };