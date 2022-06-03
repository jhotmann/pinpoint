const express = require('express');
const async = require('async');
const auth = require('../middleware/auth');
const devMw = require('../middleware/device');
const groupMw = require('../middleware/group');
const userMw = require('../middleware/user');
const { Device } = require('../models/Device');
const { Location } = require('../models/Location');

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
  //res.writeHead(200, headers);
  res.set(headers);
  res.flushHeaders();
  res.write('retry: 60000\n\n');

  const friends = await req.User.getUsersSharingWith();
  const client = createClient(Date.now(), friends, res);
  await sendLocations(friends, res);

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

Location.addListener('update', (datastore, result, query, update, options) => {
  // Find clients with device id of updated location
  // Send back array of last locations of the devices the conneciton is listening to
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

async function sendLocations(userIds, res) {
  const data = await async.map(userIds, async (userId) => {
    const locs = await Location.getLastByUserId(userId);
    return locs;
  });

  console.log(`data: ${JSON.stringify(data.flat())}`);
  res.write(`data: ${JSON.stringify(data.flat())}\n\n`);
}

function sendPings() {
  clients.forEach((client) => { console.log(`Pinging ${client.id}`); client.res.write(`event: ping\ndata: ${(new Date()).toISOString()}\n\n`); });
  setTimeout(sendPings, 30000);
}

module.exports = router;