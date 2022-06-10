const cryptoRandomString = require('crypto-random-string');
const { DataTypes } = require('sequelize');
const Base = require('./base');

class Share extends Base {}

const dataStructure = {
  // id
  // userId
  uuid: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    defaultValue: () => {
      return cryptoRandomString({ length: 40, type: 'alphanumeric' });
    },
    set(value) {
      if (!value) value = cryptoRandomString({ length: 40, type: 'alphanumeric' });
      this.setDataValue('uuid', value);
    } 
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
};

module.exports = { Share, dataStructure };