const async = require('async');
const express = require('express');
const groupMw = require('../middleware/group');
const { Group } = require('../models/Group');
const userMw = require('../middleware/user');
const { User } = require('../models/User');

const router = express.Router();

// Make sure the user requesting this page is the group admin
// Depends upon db.mwUser and db.mwGroup
// const isGroupAdmin = async (req, res, next) => {
//   if (req?.pageData?.groupData?.adminId && req.pageData.groupData.adminId === req.pageData.userData._id) {
//     next();
//   } else {
//     res.sendStatus(403);
//   }
// };

router.post('/create', userMw.one, async (req, res) => {
  const group = await Group.create(req.body.groupName, req.User);
  if (group) {
    res.send('Add Successful');
  } else {
    res.send('Error');
  }
});

router.get('/edit/:groupId', userMw.one, userMw.all, groupMw.one, groupMw.admin, async (req, res) => {
  res.render('editGroup.html', req.pageData);
});

router.post('/:groupId/invite', groupMw.one, async (req, res) => {
  let members = req.body.members || [];
  if (typeof members === 'string') members = [members];
  await async.forEachSeries(members, async (member) => {
    const user = await User.get(member);
    await req.Group.invite(user);
  });
  res.send('Done');
});

router.get('/remove-user/:groupId/:userId', userMw.one, groupMw.one, groupMw.admin, async (req, res) => {
  await req.Group.leave(req.params.userId);
  res.redirect(`/group/edit/${req.params.groupId}`);
});

router.get('/accept/:groupId', userMw.one, groupMw.one, async (req, res) => {
  await req.Group.accept(req.User._id);
  res.redirect('/user#groups');
});

router.get('/leave/:groupId', userMw.one, groupMw.one, async (req, res) => {
  await req.Group.leave(req.User._id);
  res.redirect('/user#groups');
});

router.get('/delete/:groupId', userMw.one, groupMw.one, groupMw.admin, async (req, res) => {
  await req.Group.remove();
  res.redirect('/user#groups');
});

module.exports = router;
