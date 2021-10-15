const request = require('supertest');
const app = require('../app');
const { Registration } = require('../models/Registration');
const { User } = require('../models/User');

// Create agent to save cookies
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

describe('Get the Admin page', () => {
  test('The admin user should be able to view the page', async () => {
    const response = await adminAgent.get('/admin');
    expect(response.statusCode).toBe(200);
  });

  test('The promoted user should be able to view the page', async () => {
    const response = await jesterAdminAgent.get('/admin');
    expect(response.statusCode).toBe(200);
  });

  test('The non-promoted user should not be able to view the page', async () => {
    const response = await jesterAgent.get('/admin');
    expect(response.statusCode).toBe(403);
  });
});

describe('Registration links', () => {
  let guid;
  beforeAll(async () => {
    const response = await adminAgent.get('/admin/generate-registration');
    guid = response.text;
  });

  test('The admin user should be able to create registration links', async () => {
    const registration = await Registration.getByGuid(guid);
    expect(registration).toBeTruthy();
    expect(registration.guid).toBe(guid);
  });

  test('The admin user should be able to revoke registration links', async () => {
    const response = await adminAgent.get(`/admin/revoke-registration/${guid}`);
    const registration = await Registration.getByGuid(guid);
    expect(response.statusCode).toBe(302);
    expect(registration).toBeTruthy();
    expect(registration.used).toBe(true);
  });
});

describe('User Management', () => {
  test('The admin user should be able to elevate users to administrator', async () => {
    const response = await adminAgent.post(`/admin/elevate-user/${jester._id}/true`);
    expect(response.text).toBe('Done');
    jester = await User.get(jester._id);
    expect(jester.isAdmin).toBe(true);
  });

  test('The admin user should be able to de-elevate users', async () => {
    const response = await adminAgent.post(`/admin/elevate-user/${jester._id}/false`);
    expect(response.text).toBe('Done');
    jester = await User.get(jester._id);
    expect(jester.isAdmin).toBe(false);
  });

  test('The admin user should be able to delete users', async () => {
    const response = await adminAgent.get(`/admin/delete-user/${jester._id}`);
    expect(response.statusCode).toBe(302);
    jester = await User.get(jester._id);
    expect(jester).toBe(null);
  });
});
