const async = require('async');
const { Group } = require('../db');

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
  req.allGroups = await Group.findAll({ include: ['members'] });
  if (req.allGroups) {
    req.pageData.allGroups = await async.map(req.allGroups, async (group) => {
      const data = group.toJSON();
      data.members = group.members.map((m) => m.toJSON());
      return data;
    });
  }
  next();
};

// Depends upon user.one
module.exports.user = async (req, res, next) => {
  // if (!req.User) {
  //   req.pageData.userGroups = [];
  //   next();
  // } else {
  //   req.userGroups = req.User.groups;
  //   req.pageData.userGroups = req.User.groups.toJSON();
  //   next();
  // }
  next();
};

// Depends upon user.one and group.one
module.exports.admin = async (req, res, next) => {
  if (req?.Group?.adminId && req.Group.adminId === req.User._id) {
    next();
  } else {
    res.sendStatus(403);
  }
};
