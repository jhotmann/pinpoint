const { DataTypes, Model } = require('sequelize');

class Location extends Model {}

const dataStructure = {
  // id
  // userId
  // deviceId
  data: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      return JSON.parse(this.getDataValue('data'));
    },
    set(value) {
      this.setDataValue('data', JSON.stringify(value));
    }
  }
};

module.exports = { Location, dataStructure };