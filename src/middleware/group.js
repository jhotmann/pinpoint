const async = require('async');
const { Group } = require('../db');

module.exports.getGroupData = async (uuid) => {
  try {
    const group = await Group.getByUuid(uuid);
    const groupData = group.toJSON();
    const members = await group.getMembers();
    groupData.members = members.map((member) => {
      const data = member.toJSON();
      data.accepted = member.GroupMembers.accepted;
      return data;
    });
    groupData.memberNames = members.map((member) => member.username);
    return { group, groupData };
  } catch (e) {
    console.error('ERROR getting group data:', e);
  }
  return null;
};

// Depends upon req.params.groupId
module.exports.one = async (req, _, next) => {
  if (!req.pageData) req.pageData = {};
  const data = await this.getGroupData(req.params.groupId);
  req.pageData.groupData = data.groupData;
  req.Group = data.group;
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

// Depends upon user.one and group.one
module.exports.admin = async (req, res, next) => {
  if (req?.Group?.adminId && req.Group.adminId === req.User.id) {
    next();
  } else {
    res.sendStatus(403);
  }
};
