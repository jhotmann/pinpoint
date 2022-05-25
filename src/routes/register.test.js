const request = require('supertest');
const app = require('../app');
const { User } = require('../models/User');
const { Registration } = require('../models/Registration');

const registrations = [];

beforeAll(async () => {
  // Create registration entries
  registrations.push(await Registration.create());
  registrations.push(await Registration.create());
});

afterAll(async () => {
  // Delete registration entries
  await Registration.remove({ guid: { $in: registrations } }, { multi: true });

  // Delete new users
  await User.remove({ username: 'jester-register' });
});

describe('Get /register page', () => {
  test('With valid id', async () => {
    const response = await request(app).get(`/register/${registrations[0]}`);
    expect(response.statusCode).toBe(200);
    expect(response.text).toMatch('Pinpoint Registration');
  });


  test('With invalid id', async () => {
    const response = await request(app).get('/register/abc123');
    expect(response.text).toBe('Registration Used, please request a new link.');
  });
});

describe('Use registration code', () => {
  test('With valid id', async () => {
    const response = await request(app).post(`/register/${registrations[0]}`)
      .type('form')
      .send({ username: 'jester-register' })
      .send({ password: 'jester' });
    expect(response.statusCode).toBe(302);
    expect((await User.find({ username: 'jester-register' })).length).toBe(1);
  });


  test('With invalid id', async () => {
    const response = await request(app).post(`/register/abc123`)
      .type('form')
      .send({ username: 'jester-register2' })
      .send({ password: 'jester' });
    expect(response.statusCode).toBe(200);
  });
});
