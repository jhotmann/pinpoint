const async = require('async');
const bcrypt = require('bcrypt');
const express = require('express');
const db = require('../src/database');
const mqtt = require('../src/mqtt');

const router = express.Router();

/* GET user listing. */
router.get('/', db.mwUser, db.mwUserDevices, db.mwAllUsers, db.mwUserGroups, async (req, res) => {
  if (req.user.username === 'admin') {
    res.redirect('/admin');
  } else {
    res.render('user.html', req.pageData);
  }
});

router.get('/dismiss-help', db.mwUser, async (req, res) => {
  await db.dismissHelp(req.pageData.userData._id);
  res.redirect('/user');
});

// !!!! devices !!!!

router.get('/add-device', async (req, res) => {
  res.render('addDevice.html', req.pageData);
});

router.post('/add-device', db.mwUser, async (req, res) => {
  const result = await db.createDevice(req.body.deviceName, req.body.initials, req.pageData.userData);
  if (result) {
    res.send('Add Successful');
  } else {
    res.send('Error');
  }
});

router.get('/edit-device/:deviceId', db.mwUser, async (req, res) => {
  req.pageData.deviceData = await db.getDevice(req.params.deviceId);
  if (req.pageData.deviceData.userId === req.pageData.userData._id) {
    res.render('editDevice.html', req.pageData);
  } else {
    res.redirect('/user');
  }
});

router.post('/edit-device/:deviceId', db.mwUser, db.mwUserDevices, async (req, res) => {
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

router.get('/delete-device/:deviceId', db.mwUser, db.mwUserDevices, async (req, res) => {
  if (req.pageData.userDevices.find((d) => d._id === req.params.deviceId)) {
    await db.deleteDevice(req.params.deviceId);
  }
  res.redirect(301, '/user');
});

// !!!! friends !!!!

router.post('/update-friends', db.mwUser, db.mwUserDevices, async (req, res) => {
  let friends = req.body.friends || [];
  if (typeof friends === 'string') friends = [friends];
  const removedFriends = req.pageData.userData.friends.filter((friend) => !friends.includes(friend));
  clearLocations(req.pageData.userData.username, removedFriends, req.pageData.userDevices);
  const result = await db.updateFriends(req.user.username, friends);
  if (result) {
    res.send('Edit Successful');
  } else {
    res.send('Error');
  }
});

// !!!! danger !!!!

router.post('/reset-password', db.mwUser, async (req, res) => {
  const { password } = req.body;
  const hash = await bcrypt.hash(password, 15);
  const result = await db.updatePassword(req.pageData.userData._id, hash);
  if (result) {
    res.send('Reset Successful');
  } else {
    res.send('Error');
  }
});

router.get('/delete-user', db.mwUser, db.mwUserDevices, db.mwUserGroups, async (req, res) => {
  await db.deleteUser(req.pageData.userData._id);
  await db.deleteUserDevices(req.pageData.userData._id);
  await async.eachSeries(req.pageData.userGroups, async (group) => { await db.leaveGroup(group._id, req.pageData.userData._id); });
  clearLocations(req.pageData.userData.username, req.pageData.userData.friends, req.pageData.userDevices);
  res.redirect('/');
});

function clearLocations(username, friends, devices) {
  friends.forEach((friend) => {
    devices.forEach((device) => {
      console.log(`Clearing topic: ${friend}/${username}/${device.name}`);
      try {
        mqtt.publish({ cmd: 'publish', topic: `${friend}/${username}/${device.name}` }, (err) => { console.error(err); });
      } catch {
        // The topic seems to be cleared even though it throws an exception
      }
    });
  });
}

module.exports = router;
