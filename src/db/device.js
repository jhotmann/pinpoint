const cryptoRandomString = require('crypto-random-string');
const { DataTypes } = require('sequelize');
const Base = require('./base');
const { User } = require('./user');

class Device extends Base {}

const dataStructure = {
  // id
  // userId
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
        tid: this.getDataValue('initials'),
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
        tid: this.getDataValue('initials'),
        tls: true,
        username: userData.username,
        ws: true,
      };
      const configBuffer = Buffer.from(JSON.stringify(mqttConfig), 'utf8');
      return `owntracks:///config?inline=${configBuffer.toString('base64')}`;
    },
    set() {}
  },
};

// Helper functions

function cleanString(str) {
  return str.replace(/[^A-Za-z0-9]/g, '');
}

module.exports = { Device, dataStructure };