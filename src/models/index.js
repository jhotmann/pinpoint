const async = require('async');
const bcrypt = require('bcrypt');
const cryptoRandomString = require('crypto-random-string');
const ms = require('ms');
const path = require('path');
const { Sequelize, DataTypes, Model } = require('sequelize');
const { user } = require('../middleware/device');

const dbPath = path.join(__dirname, '..', '..', 'data', 'pinpoint.sqlite');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: dbPath });

/* User
{
  id: int,
  uuid: "string", Used in URLs
  username: "string",
  passwordHash: "string",
  isAdmin: bool
  friends: ["string"],
  notificationTarget: "string",
  helpDismissed: bool
}
*/

class User extends Model {
  static async CreateNew(username, password) {
    const existing = await User.findOne({ where: { username } });
    if (existing) return null;
    const passwordHash = await bcrypt.hash(password, 15);
    const user = await this.create({ username, passwordHash });
    return user;
  }
}

User.init({
  uuid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    defaultValue: cryptoRandomString({ length: 20, type: 'alphanumeric' })
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
  friends: {
    type: DataTypes.VIRTUAL,
    async get() {
      const links = await Friend.findAll({ where: { userId: this.getDataValue('id') } });
      const friendList = await async.map(links, async (l) => {
        const friend = await User.findByPk(l.friendId);
        return friend;
      });
      return friendList;
    },
    set() {}
  },
  notificationTarget: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  helpDismissed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, { sequelize, modelName: 'User' });

User.belongsToMany(User, { through: Friend, as: 'userId', foreignKey: 'id' });
User.belongsToMany(User, { through: Friend, as: 'friendId', foreignKey: 'id' });
User.belongsToMany(Group, { through: GroupMembers, scope: { accepted: true }, as: 'groups' });
User.hasMany(Device);
User.hasMany(Location);
User.hasMany(Share);

// Map friend connections
class Friend extends Model {}

Friend.init({
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  friendId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, { sequelize, modelName: 'Friend' });

// Map group membership
class GroupMembers extends Model {}

GroupMembers.init({
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  groupId: {
    type: DataTypes.INTEGER,
    references: {
      model: Group,
      key: 'id'
    }
  },
  accepted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, { sequelize, modelName: 'GroupMembers' });

/* Group
{
  id: int,
  uuid: "string", Used in URLs
  name: "string",
  adminId: int
}
*/

class Group extends Model {}

Group.init({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  uuid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    defaultValue: cryptoRandomString({ length: 20, type: 'alphanumeric' })
  },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, { sequelize, modelName: 'Group' });

Group.belongsToMany(User, { through: GroupMembers, as: 'members' });

/* Device
{
  id: int,
  uuid: "string", Used in URLs
  name: "string",
  initials: "string",
  avatar: "string",
  card: { _type: "card", name: "string - username", tid: "string - initials", face: "string - base64 image data" }
  httpConfigLink: "string",
  mqttConfigLink: "string",
  userId: int, Link to users table by id
}
*/

class Device extends Model {}

Device.init({
  uuid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    defaultValue: cryptoRandomString({ length: 20, type: 'alphanumeric' })
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: false
  },
  initials: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  avatar: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  card: {
    type: DataTypes.VIRTUAL,
    async get() {
      const userData = await User.findByPk(this.getDataValue('userId'));
      return {
        _type: 'card',
        name: userData.username,
        tid: this.getDataValue('initials'),
        face: this.getDataValue('avatar')
      }
    },
    set() {}
  },
  httpConfig: {
    type: DataTypes.VIRTUAL,
    async get() {
      const userData = await User.findByPk(this.getDataValue('userId'));
      const httpConfig = {
        _type: 'configuration',
        autostartOnBoot: true,
        deviceId: cleanString(this.getDataValue('name')),
        locatorInterval: 300,
        mode: 3,
        monitoring: 1,
        password: userData.passwordHash,
        ping: 30,
        pubExtendedData: true,
        tid: initials,
        tls: true,
        url: `${process.env.HTTP_HOST}/pub`,
        username: userData.username,
      };
      const configBuffer = Buffer.from(JSON.stringify(httpConfig), 'utf8');
      return `owntracks:///config?inline=${configBuffer.toString('base64')}`;
    },
    set() {}
  },
  mqttConfig: {
    type: DataTypes.VIRTUAL,
    async get() {
      const userData = await User.findByPk(this.getDataValue('userId'));
      const mqttConfig = {
        _type: 'configuration',
        autostartOnBoot: true,
        clientId: `${cleanString(userData.username)}-${cleanString(this.getDataValue('name'))}`,
        deviceId: cleanString(this.getDataValue('name')),
        host: process.env.MQTT_HOST,
        keepaline: 3600,
        locatorInterval: 300,
        mode: 0,
        monitoring: 1,
        password: userData.passwordHash,
        ping: 30,
        port: 443,
        pubExtendedData: true,
        pubQos: 1,
        pubRetain: true,
        pubTopicBase: 'owntracks/%u/%d',
        sub: true,
        subQos: 1,
        subTopic: `${userData.username}/#`,
        tid: initials,
        tls: true,
        username: userData.username,
        ws: true,
      };
      const configBuffer = Buffer.from(JSON.stringify(mqttConfig), 'utf8');
      return `owntracks:///config?inline=${configBuffer.toString('base64')}`;
    },
    set() {}
  },
}, { sequelize, modelName: 'Device' });

Device.belongsTo(User);
Device.hasMany(Location);

/* CardStatus
{
  id: int,
  deviceId: "string",
  seerId: "string",
  seen: bool
}
*/

class CardStatus extends Model {
  static async see(deviceId, userId) {
    const existing = await this.findOne({ where: { deviceId, userId} });
    if (existing) {
      existing.seen = true;
      await existing.save();
      return existing;
    } else {
      const entry = await this.create({ seen: true, deviceId, userId });
      return entry;
    }
  }

  static async unsee(deviceId, userId) {
    const existing = await this.findOne({ where: { deviceId, userId} });
    if (existing) {
      existing.seen = false;
      await existing.save();
      return existing;
    }
    return null;
  }
}

CardStatus.init({
  seen: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  deviceId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, { sequelize, modelName: 'CardStatus' });

/* Location
{
  id: int,
  userId: int,
  deviceId: int, Link to devices table
  data: "string" Stringified JSON
}
*/

const Location = sequelize.define('Location', {
  data: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      return JSON.parse(this.getDataValue('data'));
    },
    set(value) {
      this.setDataValue('data', JSON.stringify(value));
    }
  }
}, {});

Location.belongsTo(Device);
Location.belongsTo(User);

/*
{
  id: int,
  uuid: "string",
  expiration: int,
  used: boolean,
}
*/

class Registration extends Model {
  static async getUnused() {
    const registrations = await this.findAll({ where: { used: false, expired: false } });
    return registrations;
  }
}

Registration.init({
  uuid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    defaultValue: cryptoRandomString({ length: 40, type: 'alphanumeric' })
  },
  expiration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: Date.now() + ms('7d')
  },
  expired: {
    type: DataTypes.VIRTUAL,
    get() {
      return Date.now() >= this.getDataValue('expiration');
    },
    set() {}
  },
  used: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, { sequelize, modelName: 'Registration' });

/* Share
{
  id: int,
  description: "string",
  uuid: "string",
  expiration: int or null,
  passwordHash: "string" or null,
  userId: int, Link to users table
}
*/

class Share extends Model {}

Share.init({
  uuid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    defaultValue: cryptoRandomString({ length: 40, type: 'alphanumeric' })
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  expiration: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  expired: {
    type: DataTypes.VIRTUAL,
    get() {
      const expiration = this.getDataValue('expiration');
      if (!expiration) return false;
      return Date.now() >= expiration;
    },
    set() {}
  },
  passwordHash: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  passwordRequired: {
    type: DataTypes.VIRTUAL,
    get() {
      const hash = this.getDataValue('passwordHash');
      return hash !== null;
    },
    set() {}
  }
}, { sequelize, modelName: 'Share' });

Share.belongsTo(User);

// Helper functions

function cleanString(str) {
  return str.replace(/[^A-Za-z0-9]/g, '');
}

module.exports = { dbPath, sequelize, User, Friend, Device, CardStatus, Location, Registration, Share };