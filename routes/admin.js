const express = require('express');
const auth = require('../src/jwtAuth');
const db = require('../src/database');

const router = express.Router();

router.get('/', auth, db.mwAllUsers, db.mwAllReg, async (req, res) => {
  if (req.user.username === 'admin') {
    req.pageData.baseUrl = `${req.protocol}://${req.hostname}${req.hostname === 'localhost' ? ':8000' : ''}`;
    res.render('admin.html', req.pageData);
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

router.get('/delete-user/:userId', auth, async (req, res) => {
  if (req.user.username === 'admin') {
    await db.deleteUser(req.params.userId);
    await db.deleteUserDevices(req.params.userId);
    res.redirect('/admin');
  } else {
    res.sendStatus(403);
  }
});

module.exports = router;
