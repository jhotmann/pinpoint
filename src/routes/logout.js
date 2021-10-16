const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.clearCookie('authorization');
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  res.redirect('/');
});

module.exports = router;
