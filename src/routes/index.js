const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
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

  res.render('index.html', req.pageData);
});

module.exports = router;
