const async = require('async');
const express = require('express');
const db = require('../src/database');

const router = express.Router();

// Make sure the user requesting this page is the group admin
// Depends upon db.mwUser and db.mwGroup
const isGroupAdmin = async (req, res, next) => {
  if (req?.pageData?.groupData?.adminId && req.pageData.groupData.adminId === req.pageData.userData._id) {
    next();
  } else {
    res.sendStatus(403);
  }
};

router.post('/create', db.mwUser, async (req, res) => {
  const result = await db.createGroup(req.body.groupName, req.pageData.userData);
  if (result) {
    res.send('Add Successful');
  } else {
    res.send('Error');
  }
});

router.get('/edit/:groupId', db.mwUser, db.mwAllUsers, db.mwGroup, isGroupAdmin, async (req, res) => {
  res.render('editGroup.html', req.pageData);
});

router.post('/:groupId/invite', async (req, res) => {
  let members = req.body.members || [];
  if (typeof members === 'string') members = [members];
  console.dir(members);
  await async.forEachSeries(members, async (member) => {
    await db.inviteToGroup(req.params.groupId, member);
  });
  res.send('Done');
});

router.get('/remove-user/:groupId/:userId', db.mwUser, db.mwGroup, isGroupAdmin, async (req, res) => {
  await db.leaveGroup(req.params.groupId, req.params.userId);
  res.redirect(`/group/edit/${req.params.groupId}`);
});

router.get('/accept/:groupId', db.mwUser, async (req, res) => {
  await db.acceptGroup(req.params.groupId, req.pageData.userData._id);
  res.redirect('/user#groups');
});

router.get('/leave/:groupId', db.mwUser, async (req, res) => {
  await db.leaveGroup(req.params.groupId, req.pageData.userData._id);
  res.redirect('/user#groups');
});

router.get('/delete/:groupId', db.mwUser, db.mwGroup, isGroupAdmin, async (req, res) => {
  await db.deleteGroup(req.params.groupId);
  res.redirect('/user#groups');
});

module.exports = router;
