require('dotenv').config();
const cookieParser = require('cookie-parser');
const express = require('express');
const logger = require('morgan');
const nunjucks = require('nunjucks');
const path = require('path');
const auth = require('./middleware/auth');
const settings = require('./middleware/settings');

const app = express();

const nunjucksEnv = nunjucks.configure(path.join(__dirname, 'views'), { express: app, autoescape: true });
nunjucksEnv.addFilter('arrayFilter', (arr, prop, value) => arr.filter((a) => a[prop] === value));
nunjucksEnv.addFilter('arrayFilterPropIncludes', (arr, prop, subprop, value) => {
  if (subprop && !value) {
    return arr.filter((a) => a[prop].includes(subprop));
  }
  if (subprop && value) {
    return arr.filter((a) => a[prop].find((p) => p[subprop] === value));
  }
  return [];
});

if (process.env.BEHIND_PROXY === 'true') app.set('trust proxy', true);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/styles/css', express.static(path.join(__dirname, '..', 'node_modules', 'bootstrap', 'dist', 'css')));
app.use('/styles/js', express.static(path.join(__dirname, '..', 'node_modules', 'bootstrap', 'dist', 'js')));
app.use(settings.envSettings);

app.use('/', auth.isLoggedIn, require('./routes/index'));
app.use('/login', require('./routes/login'));
app.use('/logout', auth.jwt, require('./routes/logout'));
app.use('/admin', auth.jwt, auth.isAdmin, require('./routes/admin'));
app.use('/user', auth.jwt, require('./routes/user'));
app.use('/group', auth.jwt, require('./routes/group'));
app.use('/register', require('./routes/register'));
app.use('/map', require('./routes/map'));
app.use('/pub', auth.basic, require('./routes/pub'));

module.exports = app;
