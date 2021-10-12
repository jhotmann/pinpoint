const aedes = require('aedes')();
const bcrypt = require('bcrypt');
const httpServer = require('http').createServer();
const ws = require('websocket-stream');
const db = require('./database');

ws.createServer({ server: httpServer }, aedes.handle);

const clientMap = {};

httpServer.listen(process.env.MQTT_PORT || 8888, () => {
  console.log(`Websocket server listening on port ${process.env.MQTT_PORT || 8888}`);
});

aedes.authenticate = (client, username, password, callback) => {
  console.log(`Auth attempt by ${username}: ${password}`);
  const invalidUserPassword = new Error('Auth error');
  invalidUserPassword.returnCode = 4;
  db.getUser(username)
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

aedes.authorizePublish = async (client, packet, callback) => {
  const username = clientMap[client.id];
  console.log(`${client.id} (${username}) published to ${packet.topic}: ${packet.payload}`);
  if (packet.topic.startsWith(`owntracks/${username}/`)) {
    await publishToFriends(client, packet);
    callback(null);
  } else {
    callback(new Error('Invalid topic'));
  }
};

async function publishToFriends(client, packet) {
  const username = clientMap[client.id];
  const userData = await db.getUser(username);
  if (!userData) return;
  userData.friends.forEach((friend) => {
    console.log(`Forwarding packet to ${friend}`);
    const newPacket = { ...packet };
    newPacket.topic = newPacket.topic.replace(/^owntracks/g, friend);
    aedes.publish(newPacket);
  });
  const userPacket = { ...packet };
  userPacket.topic = userPacket.topic.replace(/^owntracks/g, username);
  aedes.publish(userPacket);
}

aedes.authorizeSubscribe = (client, subscription, callback) => {
  const username = clientMap[client.id];
  console.log(`${username} wants to subscribe to ${subscription.topic}`);
  if (subscription.topic.startsWith(`${username}/`) || subscription.topic.startsWith(`owntracks/${username}/`)) {
    callback(null, subscription);
  } else {
    callback(new Error('Invalid topic'));
  }
};
