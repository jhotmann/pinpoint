const request = require('supertest');
const app = require('../app');
const { User } = require('../models/User');

let jester;

beforeAll(async () => {
  jester = await User.create('jester-login', 'jester');
});

afterAll(async () => {
  if (jester) await jester.remove();
});

describe('Get the login page', () => {
  test('It should response the GET method', async () => {
    const response = await request(app).get('/login');
    expect(response.statusCode).toBe(200);
  });
});

describe('Login', () => {
  test('The admin user should be able to login', async () => {
    const response = await request(app).post('/login')
      .type('form')
      .send({ username: 'admin' })
      .send({ password: process.env.ADMIN_PASSWORD });
    expect(response.statusCode).toBe(302);
  });

  test('An incorrect admin password shouldn\'t work', async () => {
    const response = await request(app).post('/login')
      .type('form')
      .send({ username: 'admin' })
      .send({ password: 'asdfjhaskjdhfakljsdflkhjsdlafhsdlj' });
    expect(response.statusCode).toBe(200);
  });

  test('The test user should be able to login', async () => {
    const response = await request(app).post('/login')
      .type('form')
      .send({ username: 'jester-login' })
      .send({ password: 'jester' });
    expect(response.statusCode).toBe(302);
  });

  test('An incorrect test user password shouldn\'t work', async () => {
    const response = await request(app).post('/login')
      .type('form')
      .send({ username: 'jester-login' })
      .send({ password: '1234567890' });
    expect(response.statusCode).toBe(200);
  });

  test('A user without an account shouldn\'t work', async () => {
    const response = await request(app).post('/login')
      .type('form')
      .send({ username: 'jester2' })
      .send({ password: '1234567890' });
    expect(response.statusCode).toBe(200);
  });
});
