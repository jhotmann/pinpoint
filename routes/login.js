const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../src/database');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('login.html');
});

router.post('/', async (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin') {
    if (password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1d' });
      res.cookie('authorization', token, { sameSite: true });
      res.send('Login Successful');
    } else {
      res.send('Invalid Password');
    }
  } else {
    const userData = await db.getUserByName(username);
    if (userData) {
      const match = await bcrypt.compare(password, userData.passwordHash);
      if (match) {
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1y' });
        res.cookie('authorization', token, { sameSite: true });
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
