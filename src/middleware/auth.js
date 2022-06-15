const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../db');

function verifyJwt(token, jwtSecret) {
  if (!token || !jwtSecret) return false;
  try {
    const decoded = jwt.verify(token, jwtSecret);
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

function cookie(req) {
  const reqCookie = req?.cookies?.authorization;
  if (reqCookie) {
    return verifyJwt(reqCookie, req?.envSettings?.jwtSecret);
  }
  return false;
}

function bearer(req) {
  const auth = req.get('Authorization');
  if (auth) {
    const parts = authorization.split(' ');
    if (parts[0].toLowerCase() === 'bearer' && parts[1]) {
      return verifyJwt(parts[1], req?.envSettings?.jwtSecret);
    }
  }
  return false;
}

async function basic(req) {
  const auth = req.get('Authorization');
  if (auth) {
    const parts = auth.split(' ');
    if (parts[0].toLowerCase() === 'basic' && parts[1]) {
      const [login, password] = Buffer.from(parts[1], 'base64').toString().split(':');
      if (login && password) {
        const user = await User.getByUsername(login);
        if (`${password}` === `${user.passwordHash}`) return { username: login };
        const match = await bcrypt.compare(password, user.passwordHash);
        if (match) return { username: login };
      }
    }
  }
  return false;
}

// jwt accpets an Authorization Bearer header or an authorization cookie
module.exports.jwt = (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  let user;
  const reqBearer = bearer(req);
  if (reqBearer) {
    user = reqBearer;
  } else {
    const reqCookie = cookie(req);
    if (reqCookie) user = reqCookie;
  }
  if (user) {
    req.user = user;
    req.pageData.username = user.username;
    next();
  } else {
    res.redirect(`/login?source=${encodeURIComponent(req.originalUrl)}`);
  }
};

module.exports.basic = async (req, res, next) => {
  const auth = await basic(req);
  if (auth) {
    req.user = auth;
    return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="401"');
  res.status(401).send('Authentication required.');
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
