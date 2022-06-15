const async = require('async');
const { Device } = require('../db');

// Depends upon req.params.deviceId
module.exports.one = async (req, res, next) => {
  req.Device = await Device.getByUuid(req.params.deviceId);
  next();
};
