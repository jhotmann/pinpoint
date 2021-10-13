const express = require('express');
const auth = require('../src/jwtAuth');
const db = require('../src/database');

const router = express.Router();

/* GET user listing. */
router.get('/', auth, db.mwUser, db.mwUserDevices, db.mwAllUsers, async (req, res) => {
  if (req.user.username === 'admin') {
    res.redirect('/admin');
  } else {
    res.render('user.html', req.pageData);
  }
});

router.get('/add-device', auth, async (req, res) => {
  res.render('addDevice.html', req.pageData);
});

router.post('/add-device', auth, db.mwUser, async (req, res) => {
  const result = await db.createDevice(req.body.deviceName, req.body.initials, req.pageData.userData);
  if (result) {
    res.send('Add Successful');
  } else {
    res.send('Error');
  }
});

router.get('/edit-device/:deviceId', auth, db.mwUser, async (req, res) => {
  req.pageData.deviceData = await db.getDevice(req.params.deviceId);
  if (req.pageData.deviceData.userId === req.pageData.userData._id) {
    res.render('editDevice.html', req.pageData);
  } else {
    res.redirect('/user');
  }
});

router.post('/edit-device/:deviceId', auth, db.mwUser, db.mwUserDevices, async (req, res) => {
  if (req.pageData.userDevices.find((d) => d._id === req.params.deviceId)) {
    const result = await db.updateDevice(req.params.deviceId, req.body.deviceName, req.body.initials, req.pageData.userData);
    if (result) {
      res.send('Edit Successful');
    } else {
      res.send('Error updating device');
    }
  } else {
    res.send('Device not found');
  }
});

router.get('/delete-device/:deviceId', auth, db.mwUser, db.mwUserDevices, async (req, res) => {
  if (req.pageData.userDevices.find((d) => d._id === req.params.deviceId)) {
    await db.deleteDevice(req.params.deviceId);
  }
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

router.get('/delete-user', auth, db.mwUser, async (req, res) => {
  await db.deleteUser(req.pageData.userData._id);
  await db.deleteUserDevices(req.pageData.userData._id);
  res.redirect('/');
});

module.exports = router;
