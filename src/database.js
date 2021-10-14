const async = require('async');
const cryptoRandomString = require('crypto-random-string');
const Datastore = require('nedb-promises');
const ms = require('ms');
const path = require('path');

const databaseOptions = {
  timestampData: true,
  autoload: true,
};

const db = {
  users: Datastore.create({ filename: path.join('data', 'users.db'), ...databaseOptions }),
  registrations: Datastore.create({ filename: path.join('data', 'registrations.db'), ...databaseOptions }),
  devices: Datastore.create({ filename: path.join('data', 'devices.db'), ...databaseOptions }),
  groups: Datastore.create({ filename: path.join('data', 'groups.db'), ...databaseOptions }),
};

// !!!! User !!!!

module.exports.createUser = async (username, passwordHash) => {
  const userData = await db.users.insert({
    username,
    passwordHash,
    devices: [],
    friends: [],
    groups: [],
  });
  return userData._id;
};

module.exports.getUser = async (_id) => {
  try {
    return await db.users.findOne({ _id });
  } catch {
    return null;
  }
};

module.exports.getUserByName = async (username) => {
  try {
    return await db.users.findOne({ username });
  } catch (err) {
    return null;
  }
};

// User Data Middleware - depends upon jwtAuth
module.exports.mwUser = async (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  req.pageData.userData = await this.getUserByName(req.user.username);
  next();
};

module.exports.getAllUsers = async () => {
  try {
    return await db.users.find({});
  } catch {
    return [];
  }
};

module.exports.mwAllUsers = async (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  req.pageData.allUsers = await this.getAllUsers();
  next();
};

module.exports.updateFriends = async (username, friends) => {
  friends = friends || [];
  if (typeof friends === 'string') friends = [friends];
  try {
    const userData = await this.getUserByName(username);
    if (!userData) return null;
    const newUserData = await db.users.update({ _id: userData._id }, { $set: { friends } });
    return newUserData;
  } catch (err) {
    console.log(err);
    return null;
  }
};

module.exports.dismissHelp = async (_id) => {
  try {
    return await db.users.update({ _id }, { $set: { helpDismissed: true } });
  } catch (err) {
    console.log(err);
    return null;
  }
};
module.exports.deleteUser = async (_id) => {
  try {
    return await db.users.remove({ _id });
  } catch (err) {
    console.log(err);
    return null;
  }
};

// !!!! Devices !!!!

module.exports.createDevice = async (name, initials, userData) => {
  try {
    const existing = await db.devices.findOne({ userId: userData._id, name });
    if (existing) return null;
    const configLink = getDeviceConfig(userData, name, initials);
    return await db.devices.insert({
      userId: userData._id,
      name,
      initials,
      configLink,
    });
  } catch (err) {
    console.log(err);
    return null;
  }
};

module.exports.getDevice = async (_id) => {
  try {
    return await db.devices.findOne({ _id });
  } catch {
    return null;
  }
};

module.exports.getUserDevices = async (userId) => {
  try {
    return await db.devices.find({ userId });
  } catch {
    return [];
  }
};

// User Devices Middleware - depends upon mwUser
module.exports.mwUserDevices = async (req, res, next) => {
  if (req.pageData.userData) {
    req.pageData.userDevices = await this.getUserDevices(req.pageData.userData._id);
  }
  next();
};

module.exports.updateDevice = async (_id, name, initials, userData) => {
  try {
    const configLink = getDeviceConfig(userData, name, initials);
    return await db.devices.update({ _id }, { $set: { name, initials, configLink } });
  } catch (err) {
    console.log(err);
    return null;
  }
};

function cleanString(str) {
  return str.replace(/[^A-Za-z0-9]/g, '');
}

function getDeviceConfig(userData, deviceName, initials) {
  const configData = {
    _type: 'configuration',
    autostartOnBoot: true,
    clientId: `${cleanString(userData.username)}-${cleanString(deviceName)}`,
    deviceId: cleanString(deviceName),
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
    subQos: 2,
    subTopic: `${userData.username}/+/+`,
    tid: initials,
    tls: true,
    username: userData.username,
    ws: true,
  };
  const configBuffer = Buffer.from(JSON.stringify(configData), 'utf8');
  return `owntracks:///config?inline=${configBuffer.toString('base64')}`;
}

module.exports.deleteDevice = async (_id) => {
  try {
    return await db.devices.remove({ _id });
  } catch (err) {
    console.log(err);
    return null;
  }
};

module.exports.deleteUserDevices = async (userId) => {
  try {
    return await db.devices.remove({ userId }, { multi: true });
  } catch {
    return null;
  }
};

// !!!! Groups !!!!

module.exports.createGroup = async (name, userData) => {
  try {
    const existing = await db.groups.findOne({ name });
    if (existing) return null;
    return await db.groups.insert({
      adminId: userData._id,
      name,
      members: [{ userId: userData._id, accepted: true }],
    });
  } catch {
    return null;
  }
};

module.exports.getGroup = async (_id) => {
  try {
    return await db.groups.findOne({ _id });
  } catch {
    return null;
  }
};

// Group Data middleware - depends upon db.mwUser and expects :groupId in the route
module.exports.mwGroup = async (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  req.pageData.groupData = await this.getGroup(req.params.groupId);
  req.pageData.groupData.members = await async.mapSeries(req.pageData.groupData.members, async (member) => {
    const userData = await this.getUser(member.userId);
    if (userData) {
      member.username = userData.username;
    } else {
      member.username = 'USER DELETED';
    }
    return member;
  });
  req.pageData.groupData.memberNames = await async.mapSeries(req.pageData.groupData.members, async (member) => member.username);
  next();
};

module.exports.getUserGroups = async (userId) => {
  try {
    return await db.groups.find({ $or: [{ adminId: userId }, { members: { $elemMatch: { userId } } }] });
  } catch {
    return null;
  }
};

// User Groups Middleware - depends upon mwUser
module.exports.mwUserGroups = async (req, res, next) => {
  if (!req.pageData.userData) {
    req.pageData.userGroups = [];
    next();
  } else {
    const userId = req.pageData.userData._id;
    if (req.pageData.userData) {
      const userGroups = await this.getUserGroups(userId);
      req.pageData.userGroups = await async.mapSeries(userGroups, async (group) => {
        group.memberNames = await async.mapSeries(group.members, async (member) => {
          const userData = await this.getUser(member.userId);
          return userData.username;
        });
        group.isAdmin = group.adminId === userId;
        group.accepted = group.members.find((member) => member.userId === userId).accepted;
        return group;
      });
    }
    next();
  }
};

module.exports.inviteToGroup = async (_id, userId) => {
  try {
    return await db.groups.update({ _id }, { $addToSet: { members: { userId, accepted: false } } });
  } catch {
    return null;
  }
};

module.exports.acceptGroup = async (_id, userId) => {
  try {
    await db.groups.update({ _id }, { $pull: { members: { userId, accepted: false } } });
    return await db.groups.update({ _id }, { $addToSet: { members: { userId, accepted: true } } });
  } catch {
    return null;
  }
};

module.exports.leaveGroup = async (_id, userId) => {
  try {
    return await db.groups.update({ _id }, { $pull: { members: { userId } } });
  } catch {
    return null;
  }
};

module.exports.deleteGroup = async (_id) => {
  try {
    return await db.groups.remove({ _id });
  } catch (err) {
    console.log(err);
    return null;
  }
};

// !!!! Registration !!!!

module.exports.createRegistration = async () => {
  const guid = cryptoRandomString({ length: 20, type: 'alphanumeric' });
  await db.registrations.insert({
    guid,
    expiration: Date.now() + ms('7d'),
    used: false,
  });
  return guid;
};

module.exports.getAllRegistrations = async () => {
  try {
    return await db.registrations
      .find({ $and: [{ $where() { return Date.now() < this.expiration; } }, { used: false }] })
      .sort({ createdAt: -1 });
  } catch {
    return [];
  }
};

module.exports.mwAllReg = async (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  req.pageData.allRegistrations = await this.getAllRegistrations();
  next();
};

module.exports.getRegistration = async (id) => {
  try {
    return await db.registrations.findOne({ guid: id });
  } catch (err) {
    return null;
  }
};

module.exports.useRegistration = async (_id) => {
  await db.registrations.update({ _id }, { $set: { used: true } });
};

// !!!! Data Migration !!!!

module.exports.dataMigration = async () => {
  console.log('Checking for any data migrations');
  const allUsers = await this.getAllUsers();

  // Move devices from user entry to own table
  async.eachSeries(allUsers.filter((u) => u.devices), async (user) => {
    async.eachSeries(user.devices, async (device) => {
      console.log(`Moving device ${device.name} to devices table`);
      await this.createDevice(device.name, device.initials, user);
    });
    await db.users.update({ _id: user._id }, { $unset: { devices: true } });
  });

  console.log('Data migrations complete');
};
