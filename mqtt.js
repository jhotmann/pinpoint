const async = require('async');
const bcrypt = require('bcrypt');
const { User } = require('./models/User');

let aedes;
const clientMap = {};

module.exports.set = (instanciated) => {
  aedes = instanciated;
}

module.exports.publish = (packet, callback) => {
  if (aedes) aedes.publish(packet, callback);
};

module.exports.authenticate = (client, username, password, callback) => {
  console.log(`Auth attempt by ${username}: ${password}`);
  const invalidUserPassword = new Error('Auth error');
  invalidUserPassword.returnCode = 4;
  User.getByUsername(username)
    .then((userData) => {
      if (!userData) {
        return callback(invalidUserPassword, null);
      }
      if (`${password}` === `${userData.passwordHash}`) {
        console.log('Supplied password matches stored hash');
        clientMap[client.id] = username;
        callback(null, true);
      } else {
        bcrypt.compare(password, userData.passwordHash)
          .then((result) => {
            if (result) {
              console.log('Hashed password matches stored hash');
              clientMap[client.id] = username;
              callback(null, true);
            } else {
              console.log('Invalid password');
              callback(invalidUserPassword, null);
            }
          });
      }
    });
};

module.exports.authorizePublish = async (client, packet, callback) => {
  const username = clientMap[client.id];
  console.log(`${client.id} (${username}) published to ${packet.topic}: ${packet.payload}`);
  if (packet.topic.startsWith(`owntracks/${username}/`)) {
    callback(null);
    await publishToFriends(client, packet);
  } else {
    callback(new Error('Invalid topic'));
  }
};

async function publishToFriends(client, packet) {
  const username = clientMap[client.id];
  const user = await User.getByUsername(username);
  if (!user) return;
  const { friends } = user;
  const groups = await user.getGroups();
  await async.eachSeries(groups, async (group) => {
    await async.eachSeries(group.members, async (member) => {
      if (member.accepted) {
        if (!friends.includes(member.username)) friends.push(member.username);
      }
    });
  });
  if (!friends.includes(username)) friends.push(username);
  friends.forEach((friend) => {
    console.log(`Forwarding packet to ${friend}`);
    const newPacket = { ...packet };
    newPacket.topic = newPacket.topic.replace(/^owntracks/g, friend);
    aedes.publish(newPacket);
  });
}

module.exports.authorizeSubscribe = (client, subscription, callback) => {
  const username = clientMap[client.id];
  console.log(`${username} wants to subscribe to ${subscription.topic}`);
  if (subscription.topic.startsWith(`${username}/`) || subscription.topic.startsWith(`owntracks/${username}/`)) {
    callback(null, subscription);
  } else {
    callback(new Error('Invalid topic'));
  }
};
