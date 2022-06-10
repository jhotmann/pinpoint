const cryptoRandomString = require('crypto-random-string');
const { DataTypes } = require('sequelize');
const Base = require('./base');

class Group extends Base {
  static async getWithMemberNames(uuid) {
    const group = await this.getByUuid(uuid);
    if (group) {
      group.memberNames = group.members.map((member) => member.username);
    }
    return group;
  }
}

const dataStructure = {
  // id
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
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
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
};

module.exports = { Group, dataStructure };