const async = require('async');
const request = require('supertest');
const app = require('../app');
const { User } = require('../models/User');
const { Device } = require('../models/Device');
const { Group } = require('../models/Group');
const { Location } = require('../models/Location');
const { CardSeen } = require('../models/CardSeen');

let jester;
let lester;
let tester;
let fester;
let zester;
const devices = [];
let group;

function getLocationObj(username, deviceName) {
  return {
    "_type":"location",
    "BSSID":"00:11:22:33:44:55",
    "SSID":"My WiFi",
    "acc":10,
    "alt":1000,
    "batt":50,
    "bs":1,
    "conn":"w",
    "created_at":10000000,
    "lat":10.1000000,
    "lon":-10.1000000,
    "t":"u",
    "tid": devices.find((device) => device.name === deviceName)?.initials || 'AA',
    "topic":`owntracks/${username}/${deviceName}`,
    "tst":10000000,
    "vac":10,
    "vel":0
  }
}

beforeAll(async () => {
  // Create test users
  jester = await User.create('jester', 'jester');
  await jester.setFriends(['zester']);
  lester = await User.create('lester', 'jester');
  await lester.setFriends(['tester']);
  tester = await User.create('tester', 'jester');
  await tester.setFriends(['zester']);
  fester = await User.create('fester', 'jester');
  zester = await User.create('zester', 'jester');
  await zester.setFriends(['jester', 'lester']);

  // Create test devices
  devices.push(await Device.create('jesterPhone', 'JP', {_type: 'card', name: 'jester', tid: 'JP'}, jester));
  devices.push(await Device.create('jesterTablet', 'JT', {_type: 'card', name: 'jester', tid: 'JT'}, jester));
  devices.push(await Device.create('lesterPhone', 'LP', {_type: 'card', name: 'lester', tid: 'LP'}, lester));
  devices.push(await Device.create('testerPhone', 'TP', {_type: 'card', name: 'tester', tid: 'TP'}, tester));
  devices.push(await Device.create('testerPhone2', 'TT', {_type: 'card', name: 'tester', tid: 'TT'}, tester));
  devices.push(await Device.create('festerPhone', 'FP', {_type: 'card', name: 'fester', tid: 'FP'}, fester));
  devices.push(await Device.create('zesterPhone', 'ZP', {_type: 'card', name: 'zester', tid: 'ZP'}, zester));

  // Create test group
  group = await Group.insert({
    name: 'Automated Testing Group',
    adminId: jester._id,
    members: [{ userId: jester._id, username: jester.username, accepted: true },
      { userId: lester._id, username: lester.username, accepted: true },
      { userId: zester._id, username: zester.username, accepted: true }],
  });

  // Add some locations
  await request(app).post('/pub').auth(jester.username, jester.passwordHash).send(getLocationObj('jester', 'jesterPhone'));
  await request(app).post('/pub').auth(jester.username, jester.passwordHash).send(getLocationObj('jester', 'jesterTablet'));
  await request(app).post('/pub').auth(lester.username, lester.passwordHash).send(getLocationObj('lester', 'lesterPhone'));
  await request(app).post('/pub').auth(tester.username, tester.passwordHash).send(getLocationObj('tester', 'testerPhone'));
  await request(app).post('/pub').auth(tester.username, tester.passwordHash).send(getLocationObj('tester', 'testerPhone2'));
  await request(app).post('/pub').auth(fester.username, fester.passwordHash).send(getLocationObj('fester', 'festerPhone'));
  await request(app).post('/pub').auth(zester.username, zester.passwordHash).send(getLocationObj('zester', 'zesterPhone'));
  
  // Mark all cards unseen
  await CardSeen.update({ seen: true }, { $set: { seen: false } });
});

afterAll(async () => {
  // Delete test group
  if (group) await group.remove();

  // Delte test devices
  await async.eachSeries(devices, async (device) => {
    await device.remove();
  });

  // Delete test users
  if (jester) await jester.remove();
  if (lester) await lester.remove();
  if (tester) await tester.remove();
  if (fester) await fester.remove();
  if (zester) await zester.remove();

  // Delete locations
  await Location.remove({ username: 'jester' }, { multi: true });
  await Location.remove({ username: 'lester' }, { multi: true });
  await Location.remove({ username: 'tester' }, { multi: true });
  await Location.remove({ username: 'fester' }, { multi: true });
  await Location.remove({ username: 'zester' }, { multi: true });
});

describe('Post a location and get the correct response', () => {
  test('Jester post, db have 2 locations, get 4 back plus cards', async () => {
    const response = await request(app).post('/pub').auth(jester.username, jester.passwordHash).send(getLocationObj('jester', 'jesterPhone'));
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(8); // 2 jester devices, 2 jester cards, 1 lester device, 1 lester card, 1 zester device, 1 zester card
    const locations = await Location.find({ username: 'jester' });
    expect(locations.length).toBe(3);
    const response2 = await request(app).post('/pub').auth(jester.username, jester.passwordHash).send(getLocationObj('jester', 'jesterPhone'));
    expect(response2.statusCode).toBe(200);
    expect(response2.body.length).toBe(4); // cards have been seen so only devices are received
  });

  test('Fester post, db have 2 locations, get 1 back', async () => {
    const response = await request(app).post('/pub').auth(fester.username, fester.passwordHash).send(getLocationObj('fester', 'festerPhone'));
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(2); // 1 location, 1 card
    const locations = await Location.find({ username: 'fester' });
    expect(locations.length).toBe(2);
    const response2 = await request(app).post('/pub').auth(fester.username, fester.passwordHash).send(getLocationObj('fester', 'festerPhone'));
    expect(response2.statusCode).toBe(200);
    expect(response2.body.length).toBe(1); // 1 location
  });

  test('Zester post, db have 2 locations, get 4 back', async () => {
    const response = await request(app).post('/pub').auth(zester.username, zester.passwordHash).send(getLocationObj('zester', 'zesterPhone'));
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(12); // 1 zester, 2 jester, 1 lester, 2 tester and cards for each
    const locations = await Location.find({ username: 'zester' });
    expect(locations.length).toBe(2);
    const response2 = await request(app).post('/pub').auth(zester.username, zester.passwordHash).send(getLocationObj('zester', 'zesterPhone'));
    expect(response2.statusCode).toBe(200);
    expect(response2.body.length).toBe(6);
  });

  test('Tester post, db have 2 locations, get 2 back', async () => {
    const response = await request(app).post('/pub').auth(tester.username, tester.passwordHash).send(getLocationObj('tester', 'testerPhone'));
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(6); // 2 tester, 1 lester, cards for each
    const locations = await Location.find({ username: 'tester' });
    expect(locations.length).toBe(3);
    const response2 = await request(app).post('/pub').auth(tester.username, tester.passwordHash).send(getLocationObj('tester', 'testerPhone'));
    expect(response2.statusCode).toBe(200);
    expect(response2.body.length).toBe(3);
  });

  test('Lester db have 1 location', async () => {
    const locations = await Location.find({ username: 'lester' });
    expect(locations.length).toBe(1);
  });
});
