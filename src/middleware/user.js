const { User } = require('../models/User');

// Depends upon auth jwt or basic
module.exports.one = async (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  req.User = await User.getByUsername(req.user.username);
  if (req.User) req.pageData.userData = req.User.toPOJO();
  next();
};

module.exports.all = async (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  const allUsers = await User.getAll();
  if (allUsers) req.pageData.allUsers = await allUsers.map((user) => user.toPOJO());
  next();
};
