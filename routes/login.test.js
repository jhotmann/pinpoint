const request = require('supertest');
const app = require('../app');

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
    expect(response.text).toBe('Login Successful');
  });

  test('An incorrect admin password shouldn\'t work', async () => {
    const response = await request(app).post('/login')
      .type('form')
      .send({ username: 'admin' })
      .send({ password: 'asdfjhaskjdhfakljsdflkhjsdlafhsdlj' });
    expect(response.text).toBe('Invalid Password');
  });
});
