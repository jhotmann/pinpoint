const apprise = require('../apprise');
const async = require('async');
const express = require('express');
const groupMw = require('../middleware/group');
const userMw = require('../middleware/user');
const { User, Group, GroupMembers } = require('../db');

const router = express.Router();

router.post('/create', userMw.one, async (req, res) => {
  try {
    await Group.create({ name: req.body.groupName, adminId: req.User });
    req.pageData.userGroups = (await userMw.getUserData(req.user.username)).userGroups;
    res.render('user-groups.html', req.pageData);
  } catch (e) {
    console.error('ERROR creating group:', e);
    res.send('Error');
  }
});

router.get('/refresh', userMw.one, (req, res) => {
  res.render('user-groups.html', req.pageData);
});

router.get('/edit/:groupId', userMw.one, userMw.all, groupMw.one, groupMw.admin, async (req, res) => {
  res.render('form-edit-group.html', req.pageData);
});

router.post('/:groupId/invite', userMw.one, userMw.all, groupMw.one, groupMw.admin, async (req, res) => {
  let members = req.body.members || [];
  if (typeof members === 'string') members = [members];
  await async.forEachSeries(members, async (member) => {
    const user = await User.getByUuid(member);
    await GroupMembers.create({ groupId: req.Group.id, userId: user.id });
    await apprise.send(`You've been invited to a group on Pinpoint`, `${req.User.username} has invited you to the ${req.Group.name} group on Pinpoint!\n\nManage the request here: ${req.protocol}://${req.get('host')}/user`, user.notificationTarget);
  });
  req.pageData.groupData = (await groupMw.getGroupData(req.params.groupId)).groupData;
  res.render('form-edit-group.html', req.pageData);
});

router.get('/remove-user/:groupId/:userId', userMw.one, userMw.all, groupMw.one, groupMw.admin, async (req, res) => {
  const user = await User.getByUuid(req.params.userId);
  await GroupMembers.destroy({ where: { groupId: req.Group.id, userId: user.id } });
  req.pageData.groupData = (await groupMw.getGroupData(req.params.groupId)).groupData;
  res.render('form-edit-group.html', req.pageData);
});

router.get('/accept/:groupId', userMw.one, groupMw.one, async (req, res) => {
  await GroupMembers.update({ accepted: true }, { where: { groupId: req.Group.id, userId: req.User.id } });
  req.pageData.userGroups = (await userMw.getUserData(req.user.username)).userGroups;
  const groupAdmin = await User.findByPk(req.Group.adminId);
  await apprise.send('Pinpoint - group invite accepted', `${req.User.username} accepted the invite to the ${req.Group.name} group. Manage your group here: ${req.protocol}://${req.get('host')}/user`, groupAdmin.notificationTarget);
  res.render('user-groups.html', req.pageData);
});

router.get('/leave/:groupId', userMw.one, groupMw.one, async (req, res) => {
  await GroupMembers.destroy({ where: { groupId: req.Group.id, userId: req.User.id } });
  req.pageData.userGroups = (await userMw.getUserData(req.user.username)).userGroups;
  res.render('user-groups.html', req.pageData);
});

router.get('/delete/:groupId', userMw.one, groupMw.one, groupMw.admin, async (req, res) => {
  await req.Group.remove();
  res.redirect('/user#groups');
});

module.exports = router;
