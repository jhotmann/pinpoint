const { Registration } = require('../models/Registration');

module.exports.all = async (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  const allRegistrations = await Registration.getAll();
  if (allRegistrations) req.pageData.allRegistrations = await allRegistrations.filter((reg) => !reg.used && Date.now() < reg.expiration).map((reg) => reg.toPOJO());
  next();
};
