const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.pageData) req.pageData = {};
  const authCookie = req.cookies.authorization;

  if (authCookie) {
    const token = authCookie;
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.sendStatus(403);
      req.user = decoded;
      req.pageData.username = req.user.username;
    });
  }
  next();
};

module.exports.jwt = (req, res, next) => {
  const authCookie = req.cookies.authorization;

  if (authCookie) {
    const token = authCookie;
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.sendStatus(403);
      req.user = decoded;
      if (!req.pageData) req.pageData = {};
      req.pageData.username = req.user.username;
      next();
    });
  } else {
    res.redirect('/login');
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
