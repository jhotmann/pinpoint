const { Device } = require('../models/Device');

// Depends upon req.params.deviceId
module.exports.one = async (req, res, next) => {
  req.Device = await Device.get(req.params.deviceId);
  next();
};

module.exports.all = async (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  const allDevices = await Device.getAll();
  if (allDevices) req.pageData.allDevices = await allDevices.map((device) => device.toPOJO());
  next();
};

// Depends upon user.one
module.exports.user = async (req, res, next) => {
  if (req.User) {
    req.userDevices = await req.User.getDevices();
    if (req.userDevices) req.pageData.userDevices = req.userDevices.map((device) => device.toPOJO());
  }
  next();
};
