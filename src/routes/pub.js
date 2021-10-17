const async = require('async');
const express = require('express');
const userMw = require('../middleware/user');
const { Location } = require('../models/Location');

const router = express.Router();

router.post('/', userMw.one, async (req, res) => {
  console.log(`${req.user.username} posted a location update`);
  if (typeof req.body === 'object' && req.body?._type === 'location') {
    await Location.create(req.body, req.User);
    const returnData = [req.body];
    const returnUsernames = [req.user.username];
    const sharers = await req.User.getUsersSharingWith();
    await async.eachSeries(sharers, async (sharer) => {
      if (sharer === req.User._id) return;
      const lastLoc = await Location.getLastByUserId(sharer);
      if (lastLoc && lastLoc.data) {
        returnData.push(lastLoc.data);
        returnUsernames.push(lastLoc.username)
      }
    });
    console.log(`Returning ${returnData.length} user location(s): ${returnUsernames.join(', ')}`);
    return res.send(returnData);
  }
  res.send('Got it');
});

module.exports = router;
