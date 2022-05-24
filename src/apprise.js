const spawn = require('cross-spawn');
const superagent = require('superagent');

const baseUrl = process.env['APPRISE_HOST'];
const emailBaseUrl = process.env['APPRISE_EMAIL_URL'];

module.exports.send = async (title, body, recipient) => {
  if (!recipient || !title || !body) return;
  if (this.isEmail(recipient)) {
    await this.sendEmail(title, body, recipient);
  } else {
    await this.sendNotification(recipient, title, body);
  }
};

module.exports.sendEmail = async (title, body, recipient) => {
  if (!emailBaseUrl && !baseUrl) return;
  await this.sendNotification(`${emailBaseUrl}${recipient}`, title, body);
};

module.exports.sendNotification = async (urls, title, body) => {
  if (!baseUrl) return;
  if (baseUrl.toLowerCase() === 'cli') {
    spawn('apprise', ['-t', title, '-b', body, urls], { stdio: 'inherit' });
  } else {
    const resp = await superagent
      .post(`${baseUrl}/notify/`)
      .send({ urls, title, body });
    if (resp.statusCode === 200) {
      console.log(`Notification sent to ${urls}`);
    } else {
      console.error(`Error sending notification: ${resp.error ? resp.error.message : resp.statusCode}`);
    }
  }
};

module.exports.isEmail = (value) => {
  // From https://emailregex.com/
  return value.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
};