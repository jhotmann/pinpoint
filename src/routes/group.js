const apprise = require('../apprise');
const async = require('async');
const express = require('express');
const groupMw = require('../middleware/group');
const userMw = require('../middleware/user');
const { User, Group } = require('../db');

const router = express.Router();

router.post('/create', userMw.one, async (req, res) => {
  const group = await Group.create(req.body.groupName, req.User);
  if (group) {
    req.pageData.userGroups = await req.User.getGroups();
    res.render('user-groups.html', req.pageData);
  } else {
    res.send('Error');
  }
});

router.get('/refresh', userMw.one, groupMw.user, (req, res) => {
  res.render('user-groups.html', req.pageData);
});

router.get('/edit/:groupId', userMw.one, userMw.all, groupMw.one, groupMw.admin, async (req, res) => {
  res.render('form-edit-group.html', req.pageData);
});

router.post('/:groupId/invite', userMw.one, userMw.all, groupMw.one, groupMw.admin, async (req, res) => {
  let members = req.body.members || [];
  if (typeof members === 'string') members = [members];
  await async.forEachSeries(members, async (member) => {
    const user = await User.get(member);
    await req.Group.invite(user);
    await apprise.send(`You've been invited to a group on Pinpoint`, `${req.User.username} has invited you to the ${req.Group.name} group on Pinpoint!\n\nManage the request here: ${req.protocol}://${req.get('host')}/user`, user.notificationTarget);
  });
  req.pageData.groupData = await Group.getWithMemberNames(req.Group._id);
  res.render('form-edit-group.html', req.pageData);
});

router.get('/remove-user/:groupId/:userId', userMw.one, userMw.all, groupMw.one, groupMw.admin, async (req, res) => {
  await req.Group.leave(req.params.userId);
  req.pageData.groupData = await Group.getWithMemberNames(req.Group._id);
  res.render('form-edit-group.html', req.pageData);
});

router.get('/accept/:groupId', userMw.one, groupMw.one, async (req, res) => {
  await req.Group.accept(req.User._id);
  req.pageData.userGroups = await req.User.getAcceptedGroups();
  const groupAdmin = await User.get(req.Group.adminId);
  await apprise.send('Pinpoint - group invite accepted', `${req.User.username} accepted the invite to the ${req.Group.name} group. Manage your group here: ${req.protocol}://${req.get('host')}/user`, groupAdmin.notificationTarget);
  res.render('user-groups.html', req.pageData);
});

router.get('/leave/:groupId', userMw.one, groupMw.one, async (req, res) => {
  await req.Group.leave(req.User._id);
  req.pageData.userGroups = await req.User.getAcceptedGroups();
  res.render('user-groups.html', req.pageData);
});

router.get('/delete/:groupId', userMw.one, groupMw.one, groupMw.admin, async (req, res) => {
  await req.Group.remove();
  res.redirect('/user#groups');
});

module.exports = router;
