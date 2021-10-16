const express = require('express');
const devMw = require('../middleware/device');
const groupMw = require('../middleware/group');
const { Registration } = require('../models/Registration');
const regMw = require('../middleware/registration');
const { User } = require('../models/User');
const userMw = require('../middleware/user');

const router = express.Router();

router.get('/', userMw.one, userMw.all, regMw.all, devMw.all, groupMw.all, async (req, res) => {
  req.pageData.baseUrl = `${req.protocol}://${req.hostname}${req.hostname === 'localhost' ? ':8000' : ''}`;
  res.render('admin.html', req.pageData);
});

router.get('/generate-registration', async (req, res) => {
  const guid = await Registration.create();
  res.send(guid);
});

router.get('/revoke-registration/:registrationId', async (req, res) => {
  const registration = await Registration.getByGuid(req.params.registrationId);
  if (registration) {
    await registration.use();
  }
  res.redirect('/admin');
});

router.post('/elevate-user/:userId/:admin', async (req, res) => {
  const user = await User.get(req.params.userId);
  await user.setIsAdmin(req.params.admin === 'true');
  res.send('Done');
});

router.get('/delete-user/:userId', async (req, res) => {
  const user = await User.get(req.params.userId);
  await user.remove();
  await user.deleteDevices();
  res.redirect('/admin');
});

module.exports = router;
