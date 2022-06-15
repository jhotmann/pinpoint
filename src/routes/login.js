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

// Accepts: application/json or text/html (default)
router.post('/', async (req, res) => {
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
      const token = jwt.sign({ username }, req.envSettings.jwtSecret, { expiresIn: '1y' });
      switch (req.get('Accept')) {
        case 'application/json':
          if (match) {
            res.json({ jwt: token });
          } else {
            res.status(401).json({ "response": "Invalid Login" });
          }
          break;
        default:
          if (match) {
            res.cookie('authorization', token, { sameSite: 'strict' });
            const currentUrlHeader = req.get('HX-Current-URL');
            let source;
            if (currentUrlHeader) {
              const currentUrl = new URL(currentUrlHeader);
              source = currentUrl.searchParams.get('source');
            }
            if (source) {
              const newUrl = decodeURIComponent(source);
              res.redirect(newUrl);
            } else {
              res.redirect('/user');
            }
          } else {
            res.render('login.html', { username, invalidPassword: true });
          }
        }
    } else { // not a valid user
      switch (req.accepts(['json', 'html'])) {
        case 'json':
          res.status(401).json({ "response": "Invalid Login" });
          break;
        default:
          res.render('login.html', { invalidUsername: true });
      }
    }
  }
});

module.exports = router;
