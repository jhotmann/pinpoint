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

module.exports.isAuthenticated = (req, res, next) => {
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
