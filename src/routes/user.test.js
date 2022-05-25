const request = require('supertest');
const app = require('../app');
const { User } = require('../models/User');
const { Device } = require('../models/Device');

// Create agents to save cookies
const adminAgent = request.agent(app);
const jesterAgent = request.agent(app);
const jesterAdminAgent = request.agent(app);

const regularUser = 'jester-user';
const elevatedUser = 'jesterAdmin-user';
let jester;
let jesterAdmin;

beforeAll(async () => {
  // Create test users
  jester = await User.create(regularUser, 'jester');
  jesterAdmin = await User.create(elevatedUser, 'jester');
  await jesterAdmin.setIsAdmin(true);

  // Login
  await adminAgent.post('/login')
    .type('form')
    .send({ username: 'admin' })
    .send({ password: process.env.ADMIN_PASSWORD });

  await jesterAgent.post('/login')
    .type('form')
    .send({ username: regularUser })
    .send({ password: 'jester' });

  await jesterAdminAgent.post('/login')
    .type('form')
    .send({ username: elevatedUser })
    .send({ password: 'jester' });
});

afterAll(async () => {
  // Delete test users
  if (jester) await jester.remove();
  if (jesterAdmin) await jesterAdmin.remove();
});

describe('Get the User page', () => {
  test('The normal user should be able to view the page', async () => {
    const response = await jesterAgent.get('/user');
    expect(response.statusCode).toBe(200);
  });

  test('The promoted user should be able to view the page', async () => {
    const response = await jesterAdminAgent.get('/user');
    expect(response.statusCode).toBe(200);
  });

  test('A non-authenticated user should not be able to view the page', async () => {
    const response = await request.agent(app).get('/user');
    expect(response.statusCode).toBe(302);
  });

  test('The admin user should not be redirected', async () => {
    const response = await adminAgent.get('/user');
    expect(response.statusCode).toBe(302);
  });
});

describe('Get the Add Device page', () => {
  test('The normal user should be able to view the page', async () => {
    const response = await jesterAgent.get('/user/add-device');
    expect(response.statusCode).toBe(200);
  });

  test('The promoted user should be able to view the page', async () => {
    const response = await jesterAdminAgent.get('/user/add-device');
    expect(response.statusCode).toBe(200);
  });

  test('A non-authenticated user should not be able to view the page', async () => {
    const response = await request.agent(app).get('/user/add-device');
    expect(response.statusCode).toBe(302);
  });

  test('The admin user should not be redirected', async () => {
    const response = await adminAgent.get('/user/add-device');
    expect(response.statusCode).toBe(302);
  });
});

describe('Get the Edit Device page', () => {
  let deviceId;

  beforeAll(async () => {
    const device = await Device.create('tempDevice', 'TD', {_type: 'card', name: 'jester', tid: 'JP'}, jester);
    deviceId = device._id;
  });

  test('The device owner should be able to view the page', async () => {
    const response = await jesterAgent.get(`/user/edit-device/${deviceId}`);
    expect(response.statusCode).toBe(200);
  });

  test('The non-device owner should not be able to view the page', async () => {
    const response = await jesterAdminAgent.get(`/user/edit-device/${deviceId}`);
    expect(response.text).toBe("Error");
  });

  test('A non-authenticated user should not be able to view the page', async () => {
    const response = await request.agent(app).get(`/user/edit-device/${deviceId}`);
    expect(response.statusCode).toBe(302);
  });

  test('The admin user should be redirected', async () => {
    const response = await adminAgent.get(`/user/edit-device/${deviceId}`);
    expect(response.text).toBe("Error");
  });
});

describe('Device Management', () => {
  let deviceId;

  beforeAll(async () => {
    await jester.deleteDevices();
  });

  afterAll(async () => {
    await jester.deleteDevices();
  });

  test('A user should be able to create a device', async () => {
    const response = await jesterAgent.post('/user/add-device')
      .type('form')
      .send({ deviceName: 'jesterDevice' })
      .send({ initials: 'JD' });
    expect(response.text).toMatch(/^[·\n]*<tr>/);
    const devices = await jester.getDevices();
    expect (devices.length).toBe(1);
    if (devices.length > 0) deviceId = devices[0]._id;
  });

  test('A user should be able to update a device', async () => {
    const response = await jesterAgent.post(`/user/edit-device/${deviceId}`)
      .type('form')
      .send({ deviceName: 'jesterDevice2' })
      .send({ initials: 'DJ' });
    expect(response.text).toMatch(/^[·\n]*<tr>/);
    const devices = await jester.getDevices();
    expect (devices.length).toBe(1);
  });

  test('A user should be able to delete a device', async () => {
    const response = await jesterAgent.get(`/user/delete-device/${deviceId}`);
    expect(response.text.trim()).toBe("");
    const devices = await jester.getDevices();
    expect (devices.length).toBe(0);
  });
});

describe('Device Management', () => {
  let friend;

  beforeAll(async () => {
    friend = await User.create('jester-friend', 'jester');
  });

  afterAll(async () => {
    await friend.remove();
  });

  test('A user should be able to add a single friend', async () => {
    const response = await jesterAgent.post('/user/update-friends')
      .type('form')
      .send({ friends: friend._id });
    expect(response.text).toMatch(/^[·\n]*<div class="form-check">/);
    jester = await jester.refresh();
    expect(jester.friends.length).toBe(1);
  });

  test('A user should be able to add multiple friends', async () => {
    const response = await jesterAgent.post('/user/update-friends')
      .type('form')
      .send(`friends=${friend._id}&friends=${jesterAdmin._id}`);
    expect(response.text).toMatch(/^[·\n]*<div class="form-check">/);
    jester = await jester.refresh();
    expect(jester.friends.length).toBe(2);
  });

  test('A user should be able to unfriend all friends', async () => {
    const response = await jesterAgent.post('/user/update-friends')
      .type('form')
      .send({ friends: null });
    expect(response.text).toMatch(/^[·\n]*<div class="form-check">/);
    jester = await jester.refresh();
    expect(jester.friends.length).toBe(0);
  });
});

describe('Device Management', () => {
  test('A user should be able to delete their account', async () => {
    const response = await jesterAgent.get('/user/delete-user');
    expect(response.statusCode).toBe(302);
    jester = await jester.refresh();
    expect(jester).toBe(null);
  });
});
