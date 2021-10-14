const express = require('express');
const db = require('../src/database');

const router = express.Router();

router.get('/', db.mwUser, db.mwAllUsers, db.mwAllReg, db.mwAllDevices, db.mwAllGroups, async (req, res) => {
  req.pageData.baseUrl = `${req.protocol}://${req.hostname}${req.hostname === 'localhost' ? ':8000' : ''}`;
  res.render('admin.html', req.pageData);
});

router.get('/generate-registration', async (req, res) => {
  const guid = await db.createRegistration();
  res.send(guid);
});

router.get('/revoke-registration/:registrationId', async (req, res) => {
  const registrationData = await db.getRegistration(req.params.registrationId);
  if (registrationData) {
    await db.useRegistration(registrationData._id);
  }
  res.redirect(301, '/admin');
});

router.post('/elevate-user/:userId/:admin', async (req, res) => {
  await db.setUserAdminStatus(req.params.userId, req.params.admin === 'true');
  res.send('Done');
});

router.get('/delete-user/:userId', async (req, res) => {
  await db.deleteUser(req.params.userId);
  await db.deleteUserDevices(req.params.userId);
  res.redirect('/admin');
});

module.exports = router;
