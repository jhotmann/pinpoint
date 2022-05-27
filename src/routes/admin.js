const express = require('express');
const devMw = require('../middleware/device');
const groupMw = require('../middleware/group');
const { Registration } = require('../models/Registration');
const regMw = require('../middleware/registration');
const { User } = require('../models/User');
const userMw = require('../middleware/user');
const { Group } = require('../models/Group');
const { Device } = require('../models/Device');

const router = express.Router();

router.get('/', userMw.one, userMw.all, regMw.all, devMw.all, groupMw.all, async (req, res) => {
  res.header('HX-Push', '/admin');
  req.pageData.baseUrl = getBaseUrl(req);
  res.render('admin.html', req.pageData);
});

router.get('/generate-registration', async (req, res) => {
  await Registration.create();
  req.pageData.baseUrl = getBaseUrl(req);
  req.pageData.allRegistrations = await Registration.getUnused();
  res.render('admin-registrations.html', req.pageData);
});

router.get('/revoke-registration/:registrationId', async (req, res) => {
  const registration = await Registration.getByGuid(req.params.registrationId);
  if (registration) {
    await registration.use();
  }
  req.pageData.baseUrl = getBaseUrl(req);
  req.pageData.allRegistrations = await Registration.getUnused();
  res.render('admin-registrations.html', req.pageData);
});

router.post('/elevate-user/:userId/:admin', async (req, res) => {
  const user = await User.get(req.params.userId);
  await user.setIsAdmin(req.params.admin === 'true');
  res.render('admin-user-input.html', { user });
});

router.get('/delete-user/:userId', async (req, res) => {
  const user = await User.get(req.params.userId);
  await user.remove();
  await user.deleteDevices();
  const allUsers = await User.getAll();
  const allDevices = await Device.getAll();
  const allGroups = await Group.getAll();
  res.render('admin-users.html', { allUsers, allDevices, allGroups })
});

module.exports = router;

function getBaseUrl(req) {
  return `${req.protocol}://${req.hostname}${req.hostname === 'localhost' ? ':8000' : ''}`;
}
