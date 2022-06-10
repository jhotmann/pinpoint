const async = require('async');
const express = require('express');
const regMw = require('../middleware/registration');
const userMw = require('../middleware/user');
const { User, Group, Device, Registration } = require('../db');

const router = express.Router();

router.get('/', userMw.one, userMw.all, regMw.all, async (req, res) => {
  res.header('HX-Push', '/admin');
  req.pageData.baseUrl = getBaseUrl(req);
  console.dir(req.pageData.allUsers);
  res.render('admin.html', req.pageData);
});

router.get('/generate-registration', async (req, res) => {
  await Registration.create();
  req.pageData.baseUrl = getBaseUrl(req);
  req.pageData.allRegistrations = await Registration.getUnused();
  res.render('admin-registrations.html', req.pageData);
});

router.get('/revoke-registration/:registrationId', async (req, res) => {
  const registration = await Registration.getByUuid(req.params.registrationId);
  if (registration) {
    await registration.destroy();
  }
  req.pageData.baseUrl = getBaseUrl(req);
  req.pageData.allRegistrations = await Registration.getUnused();
  res.render('admin-registrations.html', req.pageData);
});

router.post('/elevate-user/:userId/:admin', async (req, res) => {
  const user = await User.getByUuid(req.params.userId);
  user.isAdmin = (req.params.admin === 'true');
  await user.save();
  res.render('admin-user-input.html', { user });
});

router.get('/delete-user/:userId', async (req, res) => {
  const user = await User.getByUuid(req.params.userId);
  await user.delete();
  req.pageData.allUsers = await userMw.getAllUsersData();
  res.render('admin-users.html', req.pageData);
});

module.exports = router;

function getBaseUrl(req) {
  return `${req.protocol}://${req.hostname}${req.hostname === 'localhost' ? ':8000' : ''}`;
}
