const async = require('async');
const { Device } = require('../db');

// Depends upon req.params.deviceId
module.exports.one = async (req, res, next) => {
  req.Device = await Device.getByUuid(req.params.deviceId);
  next();
};

module.exports.all = async (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  const allDevices = await Device.findAll();
  if (allDevices) {
    req.pageData.allDevices = await async.map(allDevices, async (device) => {
      const data = device.toJSON();
      return data;
    });
  }
  next();
};
