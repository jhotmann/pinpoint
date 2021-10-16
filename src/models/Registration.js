const cryptoRandomString = require('crypto-random-string');
const ms = require('ms');
const path = require('path');
const { Base } = require('./Base');

class Registration extends Base {
  static datastore() {
    return {
      filename: path.join('data', 'registrations.db'),
      timestampData: true,
    };
  }

  static async create() {
    const guid = cryptoRandomString({ length: 40, type: 'alphanumeric' });
    const registration = new Registration({ guid, expiration: Date.now() + ms('7d'), used: false });
    await registration.save();
    return guid;
  }

  static async getByGuid(guid) {
    const one = await this.findOne({ guid });
    return one;
  }

  async use() {
    this.used = true;
    const registration = await this.save();
    return registration;
  }
}

module.exports.Registration = Registration;
