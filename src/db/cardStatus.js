const { DataTypes, Model } = require('sequelize');

class CardStatus extends Model {
  static async see(deviceId, userId) {
    const existing = await CardStatus.findOne({ where: { deviceId, userId} });
    if (existing) {
      existing.seen = true;
      await existing.save();
      return existing;
    } else {
      const entry = await CardStatus.create({ seen: true, deviceId, userId });
      return entry;
    }
  }

  static async unsee(deviceId, userId) {
    const existing = await CardStatus.findOne({ where: { deviceId, userId} });
    if (existing) {
      existing.seen = false;
      await existing.save();
      return existing;
    }
    return null;
  }
}

const dataStructure = {
  // id
  // userId
  // deviceId
  seen: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
};

module.exports = { CardStatus, dataStructure };