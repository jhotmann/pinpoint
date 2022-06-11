const async = require('async');
const express = require('express');
const userMw = require('../middleware/user');
const mqtt = require('../mqtt');
const { User, Device, CardSeen, Location, Friend } = require('../db');

const router = express.Router();

router.post('/', userMw.one, async (req, res) => {
  if (typeof req.body === 'object' && req.body?._type === 'ping') {
    // TODO reply with sharer's locations
    res.send('Got it');
  } else if (typeof req.body === 'object' && req.body?._type === 'location') {
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
      const friends = await User.findAll({ include: { model: Friend, as: 'friends', where: { userId: req.User.id } } });
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
    const sharers = await req.User.getUsersSharingWith();
    if (!sharers.includes(req.User._id)) sharers.push(req.User._id);
    await async.eachSeries(sharers, async (sharer) => {
      const lastLocs = await Location.getLastByUserId(sharer); // Get last location for all devices for the user
      console.log(`Sharer ${sharer} has ${lastLocs.length} location(s) to share`)
      await async.eachSeries(lastLocs, async (lastLoc) => {
        if (lastLoc?.data) {
          returnData.push(lastLoc.data); // Add last location to return payload
          if (!returnUsernames.includes(lastLoc.username)) returnUsernames.push(lastLoc.username);
          // Get the  device data if card not seen
          const seen = await CardSeen.findOne({ deviceId: lastLoc.deviceId, seerId: req.User._id });
          if (!seen?.seen) {
            const device = await Device.findOne({ _id: lastLoc.deviceId });
            if (device?.card) { // If device has a card, return the data and mark as seen
              console.log('Adding card data to playload');
              returnData.push(device.card);
              await CardSeen.see(device._id, req.User._id);
            }
          }
        }
      });
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
