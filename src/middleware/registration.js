const { Registration } = require('../models/Registration');

module.exports.all = async (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  const allRegistrations = await Registration.getUnused();
  req.pageData.allRegistrations = allRegistrations;
  next();
};
