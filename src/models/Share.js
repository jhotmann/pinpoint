const cryptoRandomString = require('crypto-random-string');
const ms = require('ms');
const path = require('path');
const { Base } = require('./Base');

/*
{
  _id: "string",
  description: "string",
  guid: "string",
  expiration: int or null,
  passwordHash: "string" or null,
  userId: "string"
}
*/

class Share extends Base {
  static datastore() {
    return {
      filename: path.join('data', 'shares.db'),
      timestampData: true,
    };
  }

  static async create(description, expirationMs, password, user) {
    const guid = cryptoRandomString({ length: 40, type: 'alphanumeric' });
    const expiration = expirationMs ? Date.now() + ms(expirationMs) : null;
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 15);
    }
    const share = new Share({ description, guid, expiration, passwordHash, userId: user._id });
    await share.save();
    return guid;
  }
}

module.exports.Share = Share;
