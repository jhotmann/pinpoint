const path = require('path');
const { Base } = require('./Base');

/*
{
  _id: "string",
  userId: "string",
  name: "string",
  initials: ["string"],
  configLink: "string",
  createdAt: Date,
  updatedAt: Date,
}
*/

class Device extends Base {
  static datastore() {
    return {
      filename: path.join('data', 'devices.db'),
      timestampData: true,
    };
  }

  static async create(name, initials, card, user) {
    const existing = await Device.findOne({ userId: user._id, name });
    if (existing) return null;
    const configLink = getDeviceConfig(user, name, initials);
    const device = new Device({
      userId: user._id,
      name,
      initials,
      card,
      configLink,
    });
    await device.save();
    return device;
  }

  async update(name, initials, card, user) {
    this.configLink = getDeviceConfig(user, name, initials);
    this.name = name;
    this.initials = initials;
    this.card = card;
    const device = await this.save();
    return device;
  }

  static async getByUserId(userId) {
    const devices = await Device.find({ userId });
    return devices;
  }
}

function cleanString(str) {
  return str.replace(/[^A-Za-z0-9]/g, '');
}

function getDeviceConfig(userData, deviceName, initials) {
  const mqttConfig = {
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

  const httpConfig = {
    _type: 'configuration',
    autostartOnBoot: true,
    deviceId: cleanString(deviceName),
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
  }
  
  const configBuffer = Buffer.from(JSON.stringify(process.env.MQTT_HOST ? mqttConfig : httpConfig), 'utf8');
  return `owntracks:///config?inline=${configBuffer.toString('base64')}`;
}

module.exports.Device = Device;
