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

module.exports.getUser = async (username) => {
  try {
    return await db.users.findOne({ username });
  } catch (err) {
    return null;
  }
};

module.exports.getAllUsers = async () => {
  try {
    return await db.users.find({});
  } catch {
    return [];
  }
};

module.exports.updateFriends = async (username, friends) => {
  friends = friends || [];
  if (typeof friends === 'string') friends = [friends];
  try {
    const userData = await this.getUser(username);
    if (!userData) return null;
    const newUserData = await db.users.update({ _id: userData._id }, { $set: { friends } });
    return newUserData;
  } catch (err) {
    console.log(err);
    return null;
  }
};

module.exports.addDevice = async (username, deviceName, initials) => {
  try {
    const userData = await this.getUser(username);
    if (userData && !userData.devices.find((device) => device.name === deviceName)) {
      const deviceData = {
        name: deviceName,
        initials,
        configLink: getDeviceConfig(userData, deviceName, initials),
      };
      const newUserData = await db.users
        .update({ _id: userData._id }, { $push: { devices: deviceData } });
      return newUserData;
    }
    return null;
  } catch (err) {
    console.log(err);
    return null;
  }
};

module.exports.updateDevice = async (username, originalDeviceName, newDeviceName, initials) => {
  try {
    const userData = await this.getUser(username);
    if (!userData) return null;
    const newDevices = userData.devices.map((device) => {
      if (device.name === originalDeviceName) {
        device.name = newDeviceName;
        device.initials = initials;
        device.configLink = getDeviceConfig(userData, newDeviceName, initials);
      }
      return device;
    });
    const newUserData = await db.users
      .update({ _id: userData._id }, { $set: { devices: newDevices } });
    return newUserData;
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

module.exports.deleteDevice = async (username, deviceName) => {
  try {
    const userData = await this.getUser(username);
    if (!userData) return null;
    const newDevices = userData.devices.filter((device) => device.name !== deviceName) || [];
    return await db.users.update({ _id: userData._id }, { $set: { devices: newDevices } });
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
