const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  res.header('Pragma', 'no-cache');
  res.header('HX-Push', `/login${req.query?.source ? `?source=${req.query.source}` : ''}`);
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
      res.render('login.html', { username: 'admin', invalidPassword: true });
    }
  } else {
    const user = await User.getByUsername(username);
    if (user) {
      const match = await bcrypt.compare(password, user.passwordHash);
      if (match) {
        const token = jwt.sign({ username }, req.envSettings.jwtSecret, { expiresIn: '1y' });
        res.cookie('authorization', token, { sameSite: 'strict' });
        const currentUrlHeader = req.get('HX-Current-URL');
        const currentUrl = new URL(currentUrlHeader);
        const source = currentUrl.searchParams.get('source');
        if (source) {
          const newUrl = decodeURIComponent(source);
          res.redirect(newUrl);
        } else {
          res.redirect('/user');
        }
      } else {
        res.render('login.html', { username, invalidPassword: true });
      }
    } else {
      res.render('login.html', { invalidUsername: true });
    }
  }
});

module.exports = router;
