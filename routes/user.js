const express = require('express');
const auth = require('../src/jwtAuth');
const db = require('../src/database');

const router = express.Router();

/* GET user listing. */
router.get('/', auth, async (req, res) => {
  const { username } = req.user;
  if (username === 'admin') {
    res.redirect(301, '/admin');
  } else {
    const userData = await db.getUser(username);
    const allUsers = await db.getAllUsers();
    res.render('user.html', { userData, username, allUsers });
  }
});

router.get('/add-device', auth, async (req, res) => {
  const { username } = req.user;
  res.render('addDevice.html', { username });
});

router.post('/add-device', auth, async (req, res) => {
  const { username } = req.user;
  const { deviceName, initials } = req.body;
  const result = await db.addDevice(username, deviceName, initials);
  if (result) {
    res.send('Add Successful');
  } else {
    res.send('Error');
  }
});

router.get('/edit-device/:deviceName', auth, async (req, res) => {
  const { username } = req.user;
  const userData = await db.getUser(username);
  const deviceData = userData.devices.find((device) => device.name === req.params.deviceName);
  res.render('editDevice.html', { username, userData, deviceData });
});

router.post('/edit-device/:deviceName', auth, async (req, res) => {
  const { username } = req.user;
  const { deviceName, initials } = req.body;
  const result = await db.updateDevice(username, req.params.deviceName, deviceName, initials);
  if (result) {
    res.send('Edit Successful');
  } else {
    res.send('Error');
  }
});

router.get('/delete-device/:deviceName', auth, async (req, res) => {
  const { username } = req.user;
  await db.deleteDevice(username, req.params.deviceName);
  res.redirect(301, '/user');
});

router.post('/update-friends', auth, async (req, res) => {
  const { username } = req.user;
  const { friends } = req.body;
  const result = await db.updateFriends(username, friends);
  if (result) {
    res.send('Edit Successful');
  } else {
    res.send('Error');
  }
});

module.exports = router;
