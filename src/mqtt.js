const async = require('async');
const bcrypt = require('bcrypt');
const { User, Device, CardSeen, Location } = require('./db');

let aedes;
const clientMap = {};

module.exports.set = (instanciated) => {
  aedes = instanciated;
}

module.exports.publish = (packet, callback) => {
  if (aedes) aedes.publish(packet, callback);
};

module.exports.authenticate = (client, username, password, callback) => {
  console.log(`Auth attempt by ${username}`);
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
    await publishToPinpoint(client, packet);
  } else {
    callback(new Error('Invalid topic'));
  }
};

async function publishToPinpoint(client, packet) {
  const username = clientMap[client.id];
  const user = await User.getByUsername(username);
  if (!user) return;

  const deviceRegex = new RegExp(`^owntracks/${username}/`);
  const deviceName = packet.topic.replace(deviceRegex, '');
  const device = await Device.findOne({ userId: user._id, name: deviceName });
  if (!device) return;

  await Location.create(JSON.parse(packet.payload.toString()), user, device._id);

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
  await async.eachSeries(friends, async (friend) => {
    const newPacket = { ...packet };
    newPacket.topic = newPacket.topic.replace(/^owntracks/g, friend);
    console.log(`Forwarding packet to ${newPacket.topic}`);
    aedes.publish(newPacket);
    // publish card if unseen
    if (device && device.card) {
      const friendData = await User.getByUsername(friend);
      const seen = await CardSeen.findOne({ deviceId: device._id, seerId: friendData._id });
      if (!seen?.seen) {
        console.log(`Forwarding card to ${friend}`);
        const cardPacket = { ...packet };
        cardPacket.topic = `${friend}/${username}/${deviceName}`;
        cardPacket.payload = device.card;
        aedes.publish(cardPacket);
        await CardSeen.see(device._id, friendData._id);
      }
    }
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
