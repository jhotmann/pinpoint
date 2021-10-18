const async = require('async');
const bcrypt = require('bcrypt');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const { CardSeen } = require('../models/CardSeen');
const devMw = require('../middleware/device');
const { Device } = require('../models/Device');
const groupMw = require('../middleware/group');
const mqtt = require('../mqtt');
const userMw = require('../middleware/user');

const router = express.Router();
const upload = multer({ dest: 'data/uploads/' })

/* GET user listing. */
router.get('/', userMw.one, devMw.user, userMw.all, groupMw.user, async (req, res) => {
  if (req.user.username === 'admin') {
    res.redirect('/admin');
  } else {
    res.render('user.html', req.pageData);
  }
});

router.get('/dismiss-help', userMw.one, async (req, res) => {
  await req.User.dismissHelp();
  res.redirect('/user');
});

// !!!! devices !!!!

router.get('/add-device', async (req, res) => {
  if (req.user.username === 'admin') {
    res.redirect('/admin');
  } else {
    res.render('addDevice.html', req.pageData);
  }
});

router.post('/add-device', upload.single('avatar'), userMw.one, async (req, res) => {
  const card = {_type: 'card', name: req.User.username, tid: req.body.initials};
  if (req.file) {
    const avatar = (await sharp(req.file.path).resize(200).png().toBuffer()).toString('base64');
    card.face = avatar;
    fs.unlink(req.file.path, () => { console.log('Temp file deleted') });
  }
  const existingInitials = await Device.findOne({ initials: req.body.initials });
  if (existingInitials) return res.send('Initials Invalid');
  const device = await Device.create(req.body.deviceName, req.body.initials, card, req.User);
  if (device) {
    res.send('Add Successful');
  } else {
    res.send('Error');
  }
});

router.get('/edit-device/:deviceId', userMw.one, devMw.one, async (req, res) => {
  if (req.User && req.Device && req.Device.userId === req.User._id) {
    req.pageData.deviceData = req.Device.toPOJO();
    res.render('editDevice.html', req.pageData);
  } else {
    res.redirect('/user');
  }
});

router.post('/edit-device/:deviceId', upload.single('avatar'), userMw.one, devMw.one, async (req, res) => {
  const card = {_type: 'card', name: req.User.username, tid: req.body.initials};
  if (req.body['keep-current']) {
    card.face = req.Device.card.face;
  } else if (req.file) {
    const avatar = (await sharp(req.file.path).resize(200).png().toBuffer()).toString('base64');
    card.face = avatar;
    fs.unlink(req.file.path, () => { console.log('Temp file deleted') });
  }
  if (req.Device && req.Device.userId === req.User._id) {
    await req.Device.update(req.body.deviceName, req.body.initials, card, req.User);
    await CardSeen.update({ deviceId: req.params.deviceId }, { $set: { seen: false } }); // Force friends to re-download card data
    res.send('Edit Successful');
  } else {
    res.send('Error updating device');
  }
});

router.get('/delete-device/:deviceId', userMw.one, devMw.one, async (req, res) => {
  if (req.Device && req.Device.userId === req.User._id) {
    await req.Device.remove();
    await CardSeen.remove({ deviceId: req.params.deviceId }, { multi: true });
  }
  res.redirect('/user');
});

// !!!! friends !!!!

router.post('/update-friends', userMw.one, devMw.user, async (req, res) => {
  let friends = req.body.friends || [];
  if (typeof friends === 'string') friends = [friends];
  const removedFriends = req.pageData.userData.friends.filter((friend) => !friends.includes(friend));
  clearLocations(req.pageData.userData.username, removedFriends, req.pageData.userDevices);
  const result = await req.User.setFriends(friends);
  if (result) {
    res.send('Edit Successful');
  } else {
    res.send('Error');
  }
});

// !!!! danger !!!!

router.post('/reset-password', userMw.one, async (req, res) => {
  const { password } = req.body;
  const hash = await bcrypt.hash(password, 15);
  const updatedUser = await req.User.setPasswordHash(hash);
  if (updatedUser) {
    const devices = await req.User.getDevices();
    await async.eachSeries(devices, async (device) => {
      await device.update(device.name, device.initials, device.card, updatedUser);
    });
    res.send('Reset Successful');
  } else {
    res.send('Error');
  }
});

router.get('/delete-user', userMw.one, devMw.user, groupMw.user, async (req, res) => {
  await req.User.remove();
  await req.User.deleteDevices();
  await async.eachSeries(req.userGroups, async (group) => { await group.leave(req.User._id); });
  if (process.env.MQTT_HOST) clearLocations(req.User.username, req.User.friends, req.userDevices);
  res.redirect('/logout');
});

function clearLocations(username, friends, devices) {
  if (!process.env.MQTT_HOST) return;
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
