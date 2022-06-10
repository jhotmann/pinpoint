const async = require('async');
const { User, Group } = require('../db');

module.exports.getUserData = async (username) => {
  try {
    const user = await User.findOne({
      where: { username },
      include: [
        { model: Group, as: 'groups', include: ['members']},
        'devices',
        'friends'
      ]
    });
    if (!user) return { user: null, userData: null, userGroups: [], userDevices: [] };
    const userData = user.toJSON();
    userData.friends = user.friends.map((f) => f.username);
    const userGroups = user.groups.map((g) => g.toJSON());
    const userDevices = await async.mapSeries(user.devices, async (d) => {
      const data = d.toJSON();
      data.card = await data.card;
      data.httpConfig = await data.httpConfig;
      data.mqttConfig = await data.mqttConfig;
      return data;
    });
    return { user, userData, userGroups, userDevices};
  } catch (e) {
    console.error('ERROR fetching user data:', e);
  }
  return { user: null, userData: null, userGroups: [], userDevices: [] };
};

// Depends upon auth jwt or basic
module.exports.one = async (req, _, next) => {
  if (!req.pageData) req.pageData = {};
  const data = await this.getUserData(req.user.username);
  req.User = data.user;
  req.pageData.userData = data.userData;
  req.pageData.userDevices = data.userDevices;
  req.pageData.userGroups = data.userGroups;
  next();
};

module.exports.getAllUsersData = async () => {
  const allUsers = await User.findAll({ attributes: ['id', 'uuid', 'username', 'isAdmin'], include: ['friends', 'groups', 'devices'] });
  if (allUsers) {
    const returnData = await async.map(allUsers, async (user) => {
      const data = user.toJSON();
      data.friends = user.friends.map((f) => f.username);
      data.groups = user.groups.map((g) => g.toJSON());
      data.devices = user.devices.map((d) => d.toJSON());
      return data;
    });
    return returnData;
  }
  return [];
};

module.exports.all = async (req, _, next) => {
  if (!req.pageData) req.pageData = {};
  req.pageData.allUsers = await this.getAllUsersData();
  next();
};
