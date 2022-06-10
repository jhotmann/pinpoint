const { Model } = require('sequelize');

class Base extends Model {
  static async getByUuid(uuid) {
    const existing = await this.findOne({ where: { uuid } });
    return existing;
  }
}

module.exports = Base;