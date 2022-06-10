const express = require('express');
const { User, Registration } = require('../db');

const router = express.Router();
const saltRounds = 15;

/* GET user listing. */
router.get('/:registrationId', async (req, res) => {
  const registration = await Registration.getByUuid(req.params.registrationId);
  if (registrationValid(registration)) {
    res.render('register.html', { registrationId: req.params.registrationId });
  } else {
    res.send('Registration Used, please request a new link.');
  }
});

router.post('/:registrationId', async (req, res) => {
  const registration = await Registration.getByUuid(req.params.registrationId);
  if (registrationValid(registration)) {
    const { username, password } = req.body;
    const user = await User.createNew(username, password);
    if (user) {
      registration.used = true;
      await registration.save();
      res.redirect('/login');
    } else {
      res.render('register.html', { registrationId: req.params.registrationId, error: true });
    }
  } else {
    res.render('register.html', { registrationId: req.params.registrationId, invalid: true });
  }
});

function registrationValid(registration) {
  return (registration && !registration.used && Date.now() < registration.expiration);
}

module.exports = router;
