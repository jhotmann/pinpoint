const { Group } = require('../models/Group');

// Depends upon req.params.groupId
module.exports.one = async (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  req.Group = await Group.getWithMemberNames(req.params.groupId);
  if (req.Group) {
    req.pageData.groupData = req.Group.toPOJO();
  }
  next();
};

module.exports.all = async (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  req.allGroups = await Group.getAll();
  if (req.allGroups) {
    req.pageData.allGroups = await req.allGroups.map((group) => group.toPOJO());
  }
  next();
};

// Depends upon user.one
module.exports.user = async (req, res, next) => {
  if (!req.User) {
    req.pageData.userGroups = [];
    next();
  } else {
    req.userGroups = await req.User.getGroups();
    req.pageData.userGroups = await req.User.getAcceptedGroups();
    next();
  }
};

// Depends upon user.one and group.one
module.exports.admin = async (req, res, next) => {
  if (req?.Group?.adminId && req.Group.adminId === req.User._id) {
    next();
  } else {
    res.sendStatus(403);
  }
};
