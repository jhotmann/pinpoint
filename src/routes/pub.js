const async = require('async');
const express = require('express');
const userMw = require('../middleware/user');
const mqtt = require('../mqtt');
const { User, Device, CardStatus, Location, Friend } = require('../db');

const router = express.Router();

router.post('/', userMw.one, async (req, res) => {
  if (typeof req.body === 'object' && req.body?._type === 'location') {
    const deviceName = deviceNameFromTopic(req.user.username, req.body.topic);
    const userDevice = req.pageData.userDevices.find((device) => device.name === deviceName);
    if (!userDevice) {
      console.log(`${req.user.username} posted a location update for an invalid device: ${deviceName}`);
      return;
    }
    console.log(`${req.user.username} posted a location update for device: ${deviceName}`);
    await Location.create({ data: req.body, userId: req.User.id, deviceId: userDevice.id });
    const returnData = [];
    const returnUsernames = [];

    // Publish to friends MQTT topics
    if (req.envSettings.mqttEnabled) {
      const friends = req.User.friends;
      const groupies = req.User.groups.map((g) => g.members).flat();
      friends.concat(groupies).forEach((friend) => {
        console.log(`Publishing location to ${friend.username}/${req.User.username}/${deviceName}: ${JSON.stringify(req.body)}`);
        try {
          mqtt.publish({ cmd: 'publish', topic: `${friend.username}/${req.User.username}/${deviceName}`, payload: JSON.stringify(req.body) }, (err) => { if (err) console.error(err); });
        } catch (e) {
          console.log(e);
        }
      });
    }

    // Loop through all people that share with the user who just posted their location
    const sharingDevices = await req.User.getDevicesSharingWith();
    await async.each(sharingDevices, async (deviceId) => {
      const lastLoc = await Location.findOne({ where: { deviceId }, order: [['createdAt', 'DESC']], include: [User, Device] });
      if (!lastLoc?.data) return;
      returnData.push(lastLoc.data);
      if (!returnUsernames.includes(lastLoc.User.username)) returnUsernames.push(lastLoc.User.username);
      const cardStatus = await CardStatus.findOne({ where: { deviceId, userId: req.User.id } });
      if (!cardStatus?.seen) {
        const card = await lastLoc.Device.card;
        returnData.push(card);
        await CardStatus.see(deviceId, req.User.id);
      }
    });
    
    console.log(`Returning ${returnUsernames.length} user location(s): ${returnUsernames.join(', ')}`);
    console.log(`Response size ${JSON.stringify(returnData).length} bytes`);
    return res.send(returnData);
  } else {
    res.send('Got it');
  }
});

function deviceNameFromTopic(username, topic) {
  return topic.replace(`owntracks/${username}/`, '');
}

module.exports = router;
