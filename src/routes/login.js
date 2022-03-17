const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

const router = express.Router();

router.get('/', (req, res) => {
  // res.clearCookie('authorization');
  // res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  // res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  res.render('login.html');
});

router.post('/', async (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin') {
    if (password === process.env.ADMIN_PASSWORD) {
      console.dir('here')
      const token = jwt.sign({ username }, req.envSettings.jwtSecret, { expiresIn: '1w' });
      res.cookie('authorization', token, { sameSite: 'strict' });
      res.send('Login Successful');
    } else {
      res.send('Invalid Password');
    }
  } else {
    const user = await User.getByUsername(username);
    if (user) {
      const match = await bcrypt.compare(password, user.passwordHash);
      if (match) {
        const token = jwt.sign({ username }, req.envSettings.jwtSecret, { expiresIn: '1y' });
        res.cookie('authorization', token, { sameSite: 'strict' });
        res.send('Login Successful');
      } else {
        res.send('Invalid Password');
      }
    } else {
      res.send('Invalid Username');
    }
  }
});

module.exports = router;
