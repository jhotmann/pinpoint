const async = require('async');
const { User, Group } = require('../db');

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

// Depends upon auth jwt or basic
module.exports.one = async (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  try {
    req.User = await User.findOne({
      where: { username: req.user.username },
      include: [
        { model: Group, as: 'groups', include: ['members']},
        'devices',
        'friends'
      ]
    });
  } catch (e) {
    console.error('Error fetching user:', e);
  }
  if (req.User) {
    console.dir(req.User.friends);
    req.pageData.userData = req.User.toJSON();
    req.pageData.userData.friends = req.User.friends.map((f) => f.username);
    req.pageData.userDevices = await async.mapSeries(req.User.devices, async (d) => {
      const data = d.toJSON();
      data.card = await data.card;
      data.httpConfig = await data.httpConfig;
      data.mqttConfig = await data.mqttConfig;
      return data;
    });
    req.pageData.userGroups = req.User.groups.map((g) => g.toJSON());
  }
  console.log('completed userMw.one');
  next();
};

module.exports.all = async (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  req.pageData.allUsers = await this.getAllUsersData();
  // const allUsers = await User.findAll({ attributes: ['id', 'uuid', 'username', 'isAdmin'], include: ['friends', 'groups', 'devices'] });
  // if (allUsers) {
  //   req.pageData.allUsers = await async.map(allUsers, async (user) => {
  //     const data = user.toJSON();
  //     data.friends = user.friends.map((f) => f.username);
  //     data.groups = user.groups.map((g) => g.toJSON());
  //     data.devices = user.devices.map((d) => d.toJSON());
  //     return data;
  //   });
  // }
  next();
};
