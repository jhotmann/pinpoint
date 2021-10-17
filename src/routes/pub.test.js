const request = require('supertest');
const app = require('../app');
const { User } = require('../models/User');
const { Group } = require('../models/Group');
const { Location } = require('../models/Location');

const locationObj = {"_type":"location","BSSID":"00:11:22:33:44:55","SSID":"My WiFi","acc":10,"alt":1000,"batt":50,"bs":1,"conn":"w","created_at":10000000,"lat":10.1000000,"lon":-10.1000000,"t":"u","tid":"AA","topic":"owntracks/jester/jesterPhone","tst":10000000,"vac":10,"vel":0};
let jester;
let lester;
let tester;
let fester;
let zester;
let group;

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

  // Create test group
  group = await Group.insert({
    name: 'Automated Testing Group',
    adminId: jester._id,
    members: [{ userId: jester._id, username: jester.username, accepted: true },
      { userId: lester._id, username: lester.username, accepted: true },
      { userId: zester._id, username: zester.username, accepted: true }],
  });

  // Add some locations
  await request(app).post('/pub').auth(jester.username, jester.passwordHash).send(locationObj);
  await request(app).post('/pub').auth(lester.username, lester.passwordHash).send(locationObj);
  await request(app).post('/pub').auth(tester.username, tester.passwordHash).send(locationObj);
  await request(app).post('/pub').auth(fester.username, fester.passwordHash).send(locationObj);
  await request(app).post('/pub').auth(zester.username, zester.passwordHash).send(locationObj);
});

afterAll(async () => {
  // Delete test group
  if (group) await group.remove();

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
  test('Jester post, db have 2 locations, get 3 back', async () => {
    const response = await request(app).post('/pub').auth(jester.username, jester.passwordHash).send(locationObj);
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(3);
    const locations = await Location.find({ username: 'jester' });
    expect(locations.length).toBe(2);
  });

  test('Fester post, db have 2 locations, get 1 back', async () => {
    const response = await request(app).post('/pub').auth(fester.username, fester.passwordHash).send(locationObj);
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(1);
    const locations = await Location.find({ username: 'fester' });
    expect(locations.length).toBe(2);
  });

  test('Zester post, db have 2 locations, get 4 back', async () => {
    const response = await request(app).post('/pub').auth(zester.username, zester.passwordHash).send(locationObj);
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(4);
    const locations = await Location.find({ username: 'zester' });
    expect(locations.length).toBe(2);
  });

  test('Tester post, db have 2 locations, get 2 back', async () => {
    const response = await request(app).post('/pub').auth(tester.username, tester.passwordHash).send(locationObj);
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(2);
    const locations = await Location.find({ username: 'tester' });
    expect(locations.length).toBe(2);
  });

  test('Lester db have 1 location', async () => {
    const locations = await Location.find({ username: 'lester' });
    expect(locations.length).toBe(1);
  });
});
