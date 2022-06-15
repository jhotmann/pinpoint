const express = require('express');
const async = require('async');
const fs = require('fs/promises');
const name2avatar = require('name2avatar');
const path = require('path');
const auth = require('../middleware/auth');
const devMw = require('../middleware/device');
const userMw = require('../middleware/user');
const { User, Device, Location } = require('../db');

const router = express.Router();

/* List of connected clients 
[
  {
    id: user id or share code,
    devices: [list, of, device, ids]
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

router.get('/sse', auth.jwt, userMw.one, userMw.all, async (req, res) => {
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

  const devices = await req.User.getDevicesSharingWith();
  const client = createClient(Date.now(), devices, res);
  await sendCurrentLocations(devices, res);

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

Location.addHook('afterCreate', async (location) => {
  await async.each(clients, async (client) => {
    if (client.devices.includes(location.deviceId)) {
      await sendCurrentLocations(client.devices, client.res);
    }
  });
  const user = await location.getUser();
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

async function sendCurrentLocations(deviceIds, res) {
  const data = await async.map(deviceIds, async (deviceId) => {
    const lastLoc = await Location.findOne({ where: { deviceId }, order: [['createdAt', 'DESC']], include: [User, Device] });
    if (!lastLoc) return;
    const deviceUuid = lastLoc.Device.uuid;
    return { id: deviceUuid, name: `${lastLoc.User.username} - ${lastLoc.Device.name}`, lat: lastLoc.data.lat, lon: lastLoc.data.lon, icon: `/map/avatar/${deviceUuid}`, date: lastLoc.createdAt.getTime() };
  });

  console.log(`data: ${JSON.stringify(data.flat())}`);
  res.write(`data: ${JSON.stringify(data.flat().filter((d) => d))}\n\n`);
}

function sendPings() {
  clients.forEach((client) => { console.log(`Pinging ${client.id}`); client.res.write(`event: ping\ndata: ${(new Date()).toISOString()}\n\n`); });
  setTimeout(sendPings, 30000);
}

module.exports = router;