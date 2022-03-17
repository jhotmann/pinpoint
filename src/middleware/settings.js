const cryptoRandomString = require('crypto-random-string');

const jwts = process.env['JWT_SECRET'];
const mqttHost = process.env['MQTT_HOST'];
const appriseHost = process.env['APPRISE_HOST'];
const appriseEmailUrl = process.env['APPRISE_EMAIL_URL'];

module.exports.envSettings = (req, res, next) => {
  req.envSettings = {
    mqttEnabled: mqttHost ? true : false,
    notificationsEnabled: appriseHost ? true : false,
    emailEnabled: appriseEmailUrl ? true : false,
    jwtSecret: jwts && jwts !== 'pleasechangeme' ? jwts : cryptoRandomString({ length: 40, type: 'alphanumeric' }),
  };
  if (!req?.pageData) req.pageData = {};
  req.pageData.settings = req.envSettings;
  next();
}
