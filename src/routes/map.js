const express = require('express');
const async = require('async');
const fs = require('fs/promises');
const name2avatar = require('name2avatar');
const path = require('path');
const auth = require('../middleware/auth');
const devMw = require('../middleware/device');
const groupMw = require('../middleware/group');
const userMw = require('../middleware/user');
const { Device } = require('../models/Device');
const { Location } = require('../models/Location');
const { User } = require('../models/User');

const router = express.Router();

/* List of connected clients 
[
  {
    id: user id or share code,
    friends: [list, of, friend, ids]
    res,
  }
]
*/
let clients = [];
sendPings();

const avatarCachePath = path.resolve(__dirname, '..', '..', 'data', 'image-cache');
fs.mkdir(avatarCachePath, { recursive: true });
const avatarBackgroundColors = ['#7771de', '#9e0129', '#00bfaf', '#0073cf', '#fc652c', '#484848', '#310e59', '#333333'];

router.get('/', auth.isLoggedIn, async (req, res) => {
  res.header('HX-Push', '/map');
  if (req.pageData.username) {
    res.render('map.html', req.pageData);
  } else {
    res.render('map-choice.html', req.pageData);
  }
});

router.get('/sse', auth.jwt, userMw.one, userMw.all, devMw.all, groupMw.all, async (req, res) => {
  console.log(`${req.User.username} opened a SSE connection to /map/sse`);
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  };
  res.set(headers);
  res.flushHeaders();
  res.write('retry: 60000\n\n');

  const friends = await req.User.getUsersSharingWith();
  const client = createClient(Date.now(), friends, res);
  await sendCurrentLocations(friends, res);

  res.on("close", () => {
    console.log(`Closing client ${client.id}`);
    closeClient(client.id);
    res.end();
  });
});

router.post('/share', async (req, res) => {
  console.dir(req.body);
  console.log(req.body.shareCode);
  // TODO check if valid
  res.redirect(`/map/share/${req.body.shareCode}`);
});

router.get('/share/:shareCode', async (req, res) => {
  res.header('HX-Push', req.originalUrl);
  // Send map page if share code is valid
  res.render('map.html', req.pageData);
});

router.get('/share/:shareCode/sse', async (req, res) => {
  // Keep track of client
});

router.get('/avatar/:deviceId', devMw.one, async (req, res) => {
  const avatarFilename = `${req.params.deviceId}.png`;
  const avatarPath = path.join(avatarCachePath, avatarFilename);
  const cacheFiles = await fs.readdir(avatarCachePath);
  const match = cacheFiles.find((f) => f === avatarFilename);
  if (!match) {
    let faceBuff;
    if (req.Device?.card?.face) {
      faceBuff = Buffer.from(req.Device.card.face, 'base64');
    } else {
      const randomBackground = avatarBackgroundColors[Math.floor(Math.random()*avatarBackgroundColors.length)];
      const opts = {
        size: 200,
        bgColor: randomBackground,
        color: '#ffffff',
        text: `${req.Device.initials}!`,
        isRounded: false,
        type: 'png'
      }
      faceBuff = name2avatar.getImageBuffer(opts);
    }
    await fs.writeFile(avatarPath, faceBuff);
  }
  res.sendFile(avatarPath);
});

Location.addListener('update', (datastore, result, query, update, options) => {
  // Find clients with device id of updated location
  // Send back array of last locations of the devices the conneciton is listening to
  console.log('datastore:');
  console.dir(datastore);
  console.log('result:');
  console.dir(result);
  console.log('query:');
  console.dir(query);
  console.log('update:');
  console.dir(update);
});

function createClient(id, devices, res) {
  closeClient(id);
  const client = {id, devices, res};
  clients.push(client);
  return client;
}

function closeClient(id) {
  clients = clients.filter((c) => c.id !== id);
}

/*
Data exchange format
{
  [{
    id: "string",
    name: "string",
    description: "string",
    lat: number,
    lon: number,
    icon: "string (url)",
    date: number
  }],
  connect: boolean
}
*/

async function sendCurrentLocations(userIds, res) {
  const data = await async.map(userIds, async (userId) => {
    const user = await User.get(userId);
    const locs = await Location.getLastByUserId(userId);
    const formatted = await async.map(locs, async (l) => {
      const device = await Device.get(l.deviceId);
      return { id: l.deviceId, name: `${user.username} - ${device.name}`, lat: l.data.lat, lon: l.data.lon, icon: `/map/avatar/${l.deviceId}`, date: l.createdAt };
    });
    return formatted;
  });

  console.log(`data: ${JSON.stringify(data.flat())}`);
  res.write(`data: ${JSON.stringify(data.flat())}\n\n`);
}

function sendPings() {
  clients.forEach((client) => { console.log(`Pinging ${client.id}`); client.res.write(`event: ping\ndata: ${(new Date()).toISOString()}\n\n`); });
  setTimeout(sendPings, 30000);
}

module.exports = router;