const apprise = require('../apprise');
const async = require('async');
const bcrypt = require('bcrypt');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const devMw = require('../middleware/device');
const groupMw = require('../middleware/group');
const mqtt = require('../mqtt');
const userMw = require('../middleware/user');
const { User, Device, CardSeen } = require('../db');

const router = express.Router();
const upload = multer({ dest: 'data/uploads/' });

router.use((req, _, next) => {
  req.pageData.showUserHelp = true;
  next();
});

/* GET user listing. */
router.get('/', userMw.one, userMw.all, async (req, res) => {
  if (req.user.username === 'admin') {
    res.redirect('/admin');
  } else {
    res.header('HX-Push', '/user');
    res.render('user.html', req.pageData);
  }
});

router.get('/dismiss-help', userMw.one, async (req, res) => {
  req.User.helpDismissed = true;
  await req.User.save()
  res.send('');
});

router.get('/show-help', userMw.one, async (_, res) => {
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
  const existingInitials = await Device.findOne({ where: { initials: req.body.initials } });
  if (existingInitials) {
    if (req.file) {
      fs.unlink(req.file.path, () => { console.log('Temp file deleted') });
    }
    res.header('HX-Trigger', 'invalidInitials');
    return res.status(400).send('Initials Invalid');
  }
  const device = Device.build({ name: req.body.deviceName, initials: req.body.initials, userId: req.User.id });
  if (req.file) {
    const avatar = (await sharp(req.file.path).resize(200).png().toBuffer()).toString('base64');
    device.avatar = avatar;
    fs.unlink(req.file.path, () => { console.log('Temp file deleted') });
  }
  await device.save();
  if (device) {
    // TODO if (req.envSettings.mqttEnabled) publishDeviceCards(req.User.username, req.User.friends, [ device ]);
  }
  req.pageData.userDevices = (await userMw.getUserData(req.user.username)).userDevices;
  res.header('HX-Trigger', 'deviceSave');
  res.render('user-devices.html', req.pageData);
});

router.get('/edit-device/:deviceId', userMw.one, devMw.one, async (req, res) => {
  if (req.User && req.Device && req.Device.userId === req.User.id) {
    req.pageData.deviceData = req.Device.toJSON();
    res.render('form-add-edit-device.html', req.pageData);
  } else {
    // TODO send error text
    res.send('Error');
  }
});

router.post('/edit-device/:deviceId', upload.single('avatar'), userMw.one, devMw.one, async (req, res) => {
  if (req.Device && req.Device.userId === req.User.id) {
    const existingInitials = await Device.findOne({ where: { initials: req.body.initials } });
    if (existingInitials && existingInitials.id !== req.Device.id) {
      if (req.file) fs.unlink(req.file.path, () => { console.log('Temp file deleted') });
      res.header('HX-Trigger', 'invalidInitials');
      return res.status(400).send('Initials Invalid');
    }
    if (!req.body['keep-current'] && req.file) {
      const avatar = (await sharp(req.file.path).resize(200).png().toBuffer()).toString('base64');
      req.Device.avatar = avatar;
      fs.unlink(req.file.path, () => { console.log('Temp file deleted') });
      deleteFromCache(req.params.deviceId);
    }
    req.Device.name = req.body.deviceName;
    if (req.body.initials !== req.Device.initials) {
      req.Device.initials = req.body.initials;
      deleteFromCache(req.params.deviceId);
    }
    await req.Device.save();
    // TODO await CardSeen.update({ deviceId: req.params.deviceId }, { $set: { seen: false } }); // Force friends to re-download card data (HTTP mode)
    // TODO if (req.envSettings.mqttEnabled) publishDeviceCards(req.User.username, req.User.friends, [ req.Device ]); // Send card (MQTT mode)
  }
  req.pageData.userDevices = (await userMw.getUserData(req.user.username)).userDevices;
  res.header('HX-Trigger', 'deviceSave');
  res.render('user-devices.html', req.pageData);
});

function deleteFromCache(deviceUuid) {
  fs.unlink(path.join(__dirname, '..', '..', 'data', 'image-cache', `${deviceUuid}.png`), () => {});
}

router.get('/delete-device/:deviceId', userMw.one, devMw.one, async (req, res) => {
  if (req.Device && req.Device.userId === req.User.id) {
    // TODO if (req.envSettings.mqttEnabled) clearLocations(req.User.username, req.User.friends, [ req.Device ]);
    await req.Device.delete();
  }
  req.pageData.userDevices = (await userMw.getUserData(req.user.username)).userDevices;
  res.render('user-devices.html', req.pageData);
});

// !!!! friends !!!!

router.post('/update-friends', userMw.one, userMw.all, async (req, res) => {
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
  await req.User.setFriends(friends);
  req.pageData.userData = (await userMw.getUserData(req.user.username)).userData;
  if (req.pageData.userData) {
    res.render('user-friends.html', req.pageData);
  } else {
    res.send('Error');
  }
});

// !!!! notifications !!!!

router.post('/set-notification', userMw.one, async (req, res) => {
  const input = req.body['notification-input'];
  req.User.notificationTarget = input;
  await req.User.save();
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
  req.User.passwordHash = hash;
  try {
    await req.User.save();
    res.send('Reset Successful');
  } catch (e) {
    console.error('ERROR updating user password:', e);
    res.send('Error')
  }
});

router.get('/delete-user', userMw.one, async (req, res) => {
  await req.User.delete();
  if (req.envSettings.mqttEnabled) clearLocations(req.User.username, req.User.friends, req.pageData.userDevices);
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
