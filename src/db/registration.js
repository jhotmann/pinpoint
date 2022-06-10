const cryptoRandomString = require('crypto-random-string');
const ms = require('ms');
const { DataTypes, Op } = require('sequelize');
const Base = require('./base');

class Registration extends Base {
  static async getUnused() {
    try {
      const all = await this.findAll({ where: { used: false, expiration: { [Op.gt]: Date.now() } } });
      return all;
    } catch (e) {
      console.error('ERROR getting all registrations:', e);
    }
    return null;
  }
}

const dataStructure = {
  // id
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
  expiration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: () => {
      return Date.now() + ms('7d');
    }
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
};

module.exports = { Registration, dataStructure };