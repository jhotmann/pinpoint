const async = require('async');
const express = require('express');
const userMw = require('../middleware/user');
const { Device } = require('../models/Device');
const { CardSeen } = require('../models/CardSeen');
const { Location } = require('../models/Location');

const router = express.Router();

router.post('/', userMw.one, async (req, res) => {
  if (typeof req.body === 'object' && req.body?._type === 'location') {
    const deviceName = deviceNameFromTopic(req.user.username, req.body.topic);
    const userDevice = (await Device.getByUserId(req.User._id)).find((device) => device.name === deviceName);
    console.log(`${req.user.username} posted a location update for device: ${deviceName}`);
    await Location.create(req.body, req.User, userDevice._id);
    const returnData = [];
    const returnUsernames = [];
    const sharers = await req.User.getUsersSharingWith();
    if (!sharers.includes(req.User._id)) sharers.push(req.User._id);

    // Loop through all people that share with the user who just posted their location
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
  }
  res.send('Got it');
});

function deviceNameFromTopic(username, topic) {
  return topic.replace(`owntracks/${username}/`, '');
}

module.exports = router;
