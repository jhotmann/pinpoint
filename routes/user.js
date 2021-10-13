const express = require('express');
const auth = require('../src/jwtAuth');
const db = require('../src/database');

const router = express.Router();

/* GET user listing. */
router.get('/', auth, db.mwUser, db.mwAllUsers, async (req, res) => {
  if (req.user.username === 'admin') {
    res.redirect(301, '/admin');
  } else {
    res.render('user.html', req.pageData);
  }
});

router.get('/add-device', auth, async (req, res) => {
  res.render('addDevice.html', req.pageData);
});

router.post('/add-device', auth, async (req, res) => {
  const result = await db.addDevice(req.user.username, req.body.deviceName, req.body.initials);
  if (result) {
    res.send('Add Successful');
  } else {
    res.send('Error');
  }
});

router.get('/edit-device/:deviceName', auth, db.mwUser, async (req, res) => {
  req.pageData.deviceData = req.pageData.userData.devices.find((device) => device.name === req.params.deviceName);
  res.render('editDevice.html', req.pageData);
});

router.post('/edit-device/:deviceName', auth, async (req, res) => {
  const result = await db.updateDevice(req.user.username, req.params.deviceName, req.body.deviceName, req.body.initials);
  if (result) {
    res.send('Edit Successful');
  } else {
    res.send('Error');
  }
});

router.get('/delete-device/:deviceName', auth, async (req, res) => {
  await db.deleteDevice(req.user.username, req.params.deviceName);
  res.redirect(301, '/user');
});

router.post('/update-friends', auth, async (req, res) => {
  const result = await db.updateFriends(req.user.username, req.body.friends);
  if (result) {
    res.send('Edit Successful');
  } else {
    res.send('Error');
  }
});

module.exports = router;
