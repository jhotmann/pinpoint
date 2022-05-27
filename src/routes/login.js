const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

const router = express.Router();

router.get('/', (req, res) => {
  res.header('Pragma', 'no-cache');
  res.header('HX-Push', '/login');
  res.render('login.html');
});

router.post('/', async (req, res, next) => {
  const { username, password } = req.body;
  if (username === 'admin') {
    if (password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ username }, req.envSettings.jwtSecret, { expiresIn: '1w' });
      res.cookie('authorization', token, { sameSite: 'strict' });
      res.redirect('/admin');
    } else {
      res.render('login.html', { invalidPassword: true });
    }
  } else {
    const user = await User.getByUsername(username);
    if (user) {
      const match = await bcrypt.compare(password, user.passwordHash);
      if (match) {
        const token = jwt.sign({ username }, req.envSettings.jwtSecret, { expiresIn: '1y' });
        res.cookie('authorization', token, { sameSite: 'strict' });
        res.redirect('/user');
      } else {
        res.render('login.html', { invalidPassword: true });
      }
    } else {
      res.render('login.html', { invalidUsername: true });
    }
  }
});

module.exports = router;
