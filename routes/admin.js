const express = require('express');
const auth = require('../src/jwtAuth');
const db = require('../src/database');

const router = express.Router();

/* GET user listing. */
router.get('/', auth, async (req, res) => {
  const { username } = req.user;
  if (username === 'admin') {
    const allUsers = await db.getAllUsers();
    const allRegistrations = await db.getAllRegistrations();
    const pageData = {
      username,
      allUsers,
      allRegistrations,
      baseUrl: process.env.BASE_URL,
    };
    res.render('admin.html', pageData);
  } else {
    res.sendStatus(403);
  }
});

router.get('/generate-registration', auth, async (req, res) => {
  const { username } = req.user;
  if (username === 'admin') {
    const guid = await db.createRegistration();
    res.send(guid);
  } else {
    res.sendStatus(403);
  }
});

router.get('/revoke-registration/:registrationId', auth, async (req, res) => {
  const { username } = req.user;
  if (username === 'admin') {
    const registrationData = await db.getRegistration(req.params.registrationId);
    if (registrationData) {
      await db.useRegistration(registrationData._id);
    }
  }
  res.redirect(301, '/admin');
});

module.exports = router;
