const { DataTypes, Model } = require('sequelize');

class Friend extends Model {}

const dataStructure = {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  friendId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
};

module.exports = { Friend, dataStructure };