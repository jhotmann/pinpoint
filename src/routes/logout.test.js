const request = require('supertest');
const app = require('../app');
const { User } = require('../models/User');

let jester;
const jesterAgent = request.agent(app);

beforeAll(async () => {
  jester = await User.create('jester-logout', 'jester');
  await jesterAgent.post('/login')
    .type('form')
    .send({ username: 'jester-logout' })
    .send({ password: 'jester' });
});

afterAll(async () => {
  if (jester) await jester.remove();
});

describe('Logout', () => {
  test('The user should be redirected to the home page', async () => {
    const response = await jesterAgent.get('/logout');
    expect(response.statusCode).toBe(302);
  });

  test('The logged out user should be redirected from the user page', async () => {
    const response = await jesterAgent.get('/user');
    expect(response.statusCode).toBe(302);
  });
});
