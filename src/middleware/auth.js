const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

function verifyJwt(authCookie, jwtSecret) {
  if (!authCookie || !jwtSecret) return false;
  try {
    const decoded = jwt.verify(authCookie, jwtSecret);
    return decoded;
  } catch {
    return false;
  }
}

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  const user = verifyJwt(req?.cookies?.authorization, req?.envSettings?.jwtSecret);
  if (user) {
    req.user = user;
    req.pageData.username = user.username;
  }
  next();
};

module.exports.jwt = (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  const user = verifyJwt(req?.cookies?.authorization, req?.envSettings?.jwtSecret);
  if (user) {
    req.user = user;
    req.pageData.username = user.username;
    next();
  } else {
    res.redirect(`/login?source=${encodeURIComponent(req.originalUrl)}`);
  }
};

module.exports.isAdmin = async (req, res, next) => {
  if (req.user.username === 'admin') {
    next();
  } else {
    const user = await User.getByUsername(req.user.username);
    if (user?.isAdmin) {
      next();
    } else {
      res.sendStatus(403);
    }
  }
};

module.exports.basic = async (req, res, next) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')

  if (login && password) {
    const user = await User.getByUsername(login);
    if (user) {
      if (!req.user) req.user = {};
      if (`${password}` === `${user.passwordHash}`) {
        req.user.username = login;
        return next();
      } else {
        const match = await bcrypt.compare(password, user.passwordHash);
        if (match) {
          req.user.username = login;
          return next();
        }
      }
    }
  }

  // Access denied...
  res.set('WWW-Authenticate', 'Basic realm="401"');
  res.status(401).send('Authentication required.');
}
