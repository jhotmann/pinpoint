const apprise = require('../apprise');
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
const { User } = require('../models/User');

const router = express.Router();
const upload = multer({ dest: 'data/uploads/' })

/* GET user listing. */
router.get('/', userMw.one, devMw.user, userMw.all, groupMw.user, async (req, res) => {
  if (req.user.username === 'admin') {
    res.redirect('/admin');
  } else {
    res.header('HX-Push', '/user');
    res.render('user.html', req.pageData);
  }
});

router.get('/dismiss-help', userMw.one, async (req, res) => {
  await req.User.dismissHelp();
  res.send('');
});

router.get('/show-help', userMw.one, async (req, res) => {
  res.render('user-help.html');
});

// !!!! devices !!!!

router.get('/add-device', async (req, res) => {
  if (req.user.username === 'admin') {
    res.redirect('/admin');
  } else {
    res.render('form-add-edit-device.html', req.pageData);
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
    if (req.envSettings.mqttEnabled) publishDeviceCards(req.User.username, req.User.friends, [ device ]);
  }
  const userDevices = await Device.getByUserId(req.User._id);
  res.render('user-devices.html', { userDevices });
});

router.get('/edit-device/:deviceId', userMw.one, devMw.one, async (req, res) => {
  if (req.User && req.Device && req.Device.userId === req.User._id) {
    req.pageData.deviceData = req.Device.toPOJO();
    res.render('form-add-edit-device.html', req.pageData);
  } else {
    // TODO send error text
    res.send('Error');
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
    req.Device = await req.Device.update(req.body.deviceName, req.body.initials, card, req.User);
    await CardSeen.update({ deviceId: req.params.deviceId }, { $set: { seen: false } }); // Force friends to re-download card data (HTTP mode)
    if (req.envSettings.mqttEnabled) publishDeviceCards(req.User.username, req.User.friends, [ req.Device ]); // Send card (MQTT mode)
  }
  const userDevices = await Device.getByUserId(req.User._id);
  res.render('user-devices.html', { userDevices });
});

router.get('/delete-device/:deviceId', userMw.one, devMw.one, async (req, res) => {
  if (req.Device && req.Device.userId === req.User._id) {
    if (req.envSettings.mqttEnabled) clearLocations(req.User.username, req.User.friends, [ req.Device ]);
    await req.Device.remove();
    await CardSeen.remove({ deviceId: req.params.deviceId }, { multi: true });
  }
  const userDevices = await Device.getByUserId(req.User._id);
  res.render('user-devices.html', { userDevices });
});

// !!!! friends !!!!

router.post('/update-friends', userMw.one, userMw.all, devMw.user, async (req, res) => {
  let friends = req.body.friends || [];
  if (typeof friends === 'string') friends = [friends];
  const addedFriends = friends.filter((friend) => !req.pageData.userData.friends.includes(friend));
  if (req.envSettings.mqttEnabled) {
    const removedFriends = req.pageData.userData.friends.filter((friend) => !friends.includes(friend));
    clearLocations(req.pageData.userData.username, removedFriends, req.pageData.userDevices);
    publishDeviceCards(req.User.username, addedFriends, req.pageData.userDevices);
  }
  if (req.envSettings.notificationsEnabled) {
    await async.eachSeries(addedFriends, async (friend) => {
      const friendUser = await User.getByUsername(friend);
      await apprise.send(`Pinpoint - ${req.User.username} added you as a friend`, `You will now see ${req.User.username}'s location, but they will only see yours if you add them as a friend. Manage your friends here: ${req.protocol}://${req.get('host')}/user`, friendUser?.notificationTarget);
    });
  }
  req.pageData.userData = await req.User.setFriends(friends);
  if (req.pageData.userData) {
    res.render('user-friends.html', req.pageData);
  } else {
    res.send('Error');
  }
});

// !!!! notifications !!!!

router.post('/set-notification', userMw.one, async (req, res) => {
  const input = req.body['notification-input'];
  await req.User.setNotificationTarget(input);
  res.render('user-notification-button.html');
});

router.post('/test-notification', userMw.one, async (req, res) => {
  const input = req.body['notification-input'];
  if (apprise.isEmail(input)) {
    apprise.sendEmail("Pinpoint Test", "This is a test email from Pinpoint", input);
  } else {
    apprise.sendNotification(input, "Pinpoint Test", "This is a test notification from Pinpoint");
  }
  res.send('<button id="test-notification-button" type="button" class="btn btn-primary mt-2" disabled>Testing!</button>');
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
  if (req.envSettings.mqttEnabled) clearLocations(req.User.username, req.User.friends, req.userDevices);
  res.redirect('/logout');
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

function publishDeviceCards(username, friends, devices) {
  friends.forEach((friend) => {
    devices.forEach((device) => {
      const topic = `${friend}/${username}/${device.name}`;
      console.log(`Publishing card to ${topic}`);
      try {
        mqtt.publish(device.card, topic, (err) => { console.error(err) });
      } catch {
        // do nothing
      }
    });
  });
}

module.exports = router;
