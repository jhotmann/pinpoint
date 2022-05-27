const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
  res.render('index.html', req.pageData);
});

module.exports = router;
