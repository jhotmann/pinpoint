const bcrypt = require('bcrypt');
const express = require('express');
const { User } = require('../models/User');
const { Registration } = require('../models/Registration');

const router = express.Router();
const saltRounds = 15;

/* GET user listing. */
router.get('/:registrationId', async (req, res) => {
  const registration = await Registration.getByGuid(req.params.registrationId);
  if (registrationValid(registration)) {
    res.render('register.html');
  } else {
    res.send('Registration Used, please request a new link.');
  }
});

router.post('/:registrationId', async (req, res) => {
  const registration = await Registration.getByGuid(req.params.registrationId);
  if (registrationValid(registration)) {
    const { username, password } = req.body;
    const user = await User.create(username, password);
    if (user) {
      await registration.use();
      res.send('Register Successful');
    } else {
      res.send('Error Creating User');
    }
  } else {
    res.send('Registration Used, please request a new link.');
  }
});

function registrationValid(registration) {
  return (registration && !registration.used && Date.now() < registration.expiration);
}

module.exports = router;
