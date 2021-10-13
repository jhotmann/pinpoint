const express = require('express');
const auth = require('../src/jwtAuth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  res.clearCookie('authorization');
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  res.redirect('/');
});

module.exports = router;
