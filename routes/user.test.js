const request = require('supertest');
const app = require('../app');
const { User } = require('../models/User');

// Create agents to save cookies
const adminAgent = request.agent(app);
const jesterAgent = request.agent(app);
const jesterAdminAgent = request.agent(app);

let jester;
let jesterAdmin;

beforeAll(async () => {
  // Create test users
  jester = await User.create('jester', 'jester');
  jesterAdmin = await User.create('jesterAdmin', 'jester');
  await jesterAdmin.setIsAdmin(true);

  // Login
  await adminAgent.post('/login')
    .type('form')
    .send({ username: 'admin' })
    .send({ password: process.env.ADMIN_PASSWORD });

  await jesterAgent.post('/login')
    .type('form')
    .send({ username: 'jester' })
    .send({ password: 'jester' });

  await jesterAdminAgent.post('/login')
    .type('form')
    .send({ username: 'jesterAdmin' })
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

describe('Device Management', () => {
  afterAll(async () => {
    await jester.deleteDevices();
  });

  test('A user should be able to create a device', async () => {
    const response = await jesterAgent.post('/user/add-device')
      .type('form')
      .send({ deviceName: 'jesterDevice' })
      .send({ initials: 'JD' });
    expect(response.text).toBe('Add Successful');
    const devices = await jester.getDevices();
    expect (devices.length).toBe(1);
  });
});
