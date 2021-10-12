const bcrypt = require('bcrypt');
const express = require('express');
const db = require('../src/database');

const router = express.Router();
const saltRounds = 15;

/* GET user listing. */
router.get('/:registrationId', async (req, res) => {
  const registrationData = await db.getRegistration(req.params.registrationId);
  if (registrationValid(registrationData)) {
    res.render('register.html');
  } else {
    res.render('invalidRegistration.html');
  }
});

router.post('/:registrationId', async (req, res) => {
  const registrationData = await db.getRegistration(req.params.registrationId);
  if (registrationValid(registrationData)) {
    const { username, password } = req.body;
    const userData = await db.getUser(username);
    if (userData) {
      res.send('Username Taken');
    } else {
      const hash = await bcrypt.hash(password, saltRounds);
      const dbId = await db.createUser(username, hash);
      if (dbId) {
        await db.useRegistration(registrationData._id);
        res.send('Register Successful');
      } else {
        res.send('Error Creating User');
      }
    }
  } else {
    res.render('invalidRegistration.html');
  }
});

function registrationValid(registrationData) {
  return (registrationData && !registrationData.used && Date.now() < registrationData.expiration);
}

module.exports = router;
