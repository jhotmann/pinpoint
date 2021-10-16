const { Model } = require('nedb-models');

class Base extends Model {
  static async get(_id) {
    const one = await this.findOne({ _id });
    return one;
  }

  static async getAll() {
    const all = await this.find();
    return all;
  }
}

module.exports.Base = Base;
