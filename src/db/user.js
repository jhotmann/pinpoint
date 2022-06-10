const async = require('async');
const bcrypt = require('bcrypt');
const cryptoRandomString = require('crypto-random-string');
const { DataTypes } = require('sequelize');
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