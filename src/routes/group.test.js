const request = require('supertest');
const app = require('../app');
const { User } = require('../models/User');
const { Group } = require('../models/Group');

// Create agents to save cookies
const jesterAgent = request.agent(app);
const friendAgent = request.agent(app);

let jester;
let friend;
let group;

beforeAll(async () => {
  // Create test users
  jester = await User.create('jester-group', 'jester');
  friend = await User.create('jester-friend', 'jester');

  // Login
  await jesterAgent.post('/login')
    .type('form')
    .send({ username: 'jester-group' })
    .send({ password: 'jester' });

  await friendAgent.post('/login')
    .type('form')
    .send({ username: 'jester-friend' })
    .send({ password: 'jester' });
});

afterAll(async () => {
  // Delete all test groups
  await Group.remove({ adminId: jester._id }, { multi: true });

  // Delete test users
  if (jester) await jester.remove();
  if (friend) await friend.remove();
});

describe('Create a group', () => {
  test('A user can create a group that they administer', async () => {
    const response = await jesterAgent.post('/group/create')
      .type('form')
      .send({ groupName: 'Court Jesters' });
    expect(response.text).toBe('Add Successful');
    group = await Group.findOne({ name: 'Court Jesters', adminId: jester._id });
    expect(group).toBeTruthy();
  });
});

describe('Invite to group', () => {
  test('A user can inite user to their groups', async () => {
    const response = await jesterAgent.post(`/group/${group._id}/invite`)
      .type('form')
      .send({ members: [friend._id] });
    expect(response.text).toBe('Done');
    group = await Group.findOne({ name: 'Court Jesters', adminId: jester._id });
    expect(group.members.length).toBe(2);
  });
});
