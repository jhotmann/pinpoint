const path = require('path');
const { Sequelize, DataTypes, Model } = require('sequelize');

const dbPath = path.join(__dirname, '..', '..', 'data', 'pinpoint.sqlite');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: dbPath, logging: false });

// Models defined in other files
const { User, dataStructure: userDS } = require('./user');
User.init(userDS, { sequelize, modelName: 'User' });
const { Group, dataStructure: groupDS } = require('./group');
Group.init(groupDS, { sequelize, modelName: 'Group' });
const { Device, dataStructure: deviceDS } = require('./device');
Device.init(deviceDS, { sequelize, modelName: 'Device' });
const { CardStatus, dataStructure: cardStatusDs } = require('./cardStatus');
CardStatus.init(cardStatusDs, { sequelize, modelName: 'CardStatus' });
const { Share, dataStructure: shareDs } = require('./share');
Share.init(shareDs, { sequelize, modelName: 'Share' });
const { Registration, dataStructure: registrationDs } = require('./registration');
Registration.init(registrationDs, { sequelize, modelName: 'Registration' });
const { Friend, dataStructure: friendDs } = require('./friend');
Friend.init(friendDs, { sequelize, modelName: 'Friend' });
const { Location, dataStructure: locationDs } = require('./location');
Location.init(locationDs, { sequelize, modelName: 'Location' });

// Map group membership
class GroupMembers extends Model {}
GroupMembers.init({
  // userId
  // groupId
  accepted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, { sequelize, modelName: 'GroupMembers' });

// !!!!! Table relationships !!!!!
// Friendships
User.belongsToMany(User, { through: Friend, foreignKey: 'userId', targetKey: 'id', as: 'friends' });
User.belongsToMany(User, { through: Friend, foreignKey: 'friendId', targetKey: 'id', as: 'senders' });
// Groups
//User.belongsToMany(Group, { through: { model: GroupMembers, scope: { accepted: true }}, as: 'groups', foreignKey: 'userId' });
User.belongsToMany(Group, { through: { model: GroupMembers, attributes: ['accepted'] }, as: 'groups', foreignKey: 'userId' });
Group.belongsToMany(User, { through: { model: GroupMembers, attributes: ['accepted'] }, as: 'members', foreignKey: 'groupId' });
// User Devices
User.hasMany(Device, { as: 'devices', foreignKey: 'userId' });
Device.belongsTo(User, { foreignKey: 'userId' });
// Locations
User.hasMany(Location, { foreignKey: 'userId' });
Device.hasMany(Location, { foreignKey: 'deviceId' });
Location.belongsTo(Device, { foreignKey: 'deviceId' });
Location.belongsTo(User, { foreignKey: 'userId' });
// Location Shares
User.hasMany(Share, { foreignKey: 'userId' });
Share.belongsTo(User, { foreignKey: 'userId' });
Device.hasMany(Share, { foreignKey: 'deviceId' });
Share.belongsTo(Device, { foreignKey: 'deviceId' })
// Card Status
User.hasMany(CardStatus, { foreignKey: 'userId' });
Device.hasMany(CardStatus, { foreignKey: 'deviceId' });
CardStatus.belongsTo(Device, { foreignKey: 'deviceId' });
CardStatus.belongsTo(User, { foreignKey: 'userId' });

module.exports = { dbPath, sequelize, User, Group, GroupMembers, Friend, Device, CardStatus, Location, Registration, Share };