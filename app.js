const cookieParser = require('cookie-parser');
const express = require('express');
const logger = require('morgan');
const nunjucks = require('nunjucks');
const path = require('path');
const auth = require('./middleware/auth');

require('dotenv').config();

const app = express();

const nunjucksEnv = nunjucks.configure('views', { express: app, autoescape: true });
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
app.use('/styles/css', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist', 'css')));
app.use('/styles/js', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist', 'js')));

app.use('/', auth.isLoggedIn, require('./routes/index'));
app.use('/login', require('./routes/login'));
app.use('/logout', auth.isAuthenticated, require('./routes/logout'));
app.use('/admin', auth.isAuthenticated, auth.isAdmin, require('./routes/admin'));
app.use('/user', auth.isAuthenticated, require('./routes/user'));
app.use('/group', auth.isAuthenticated, require('./routes/group'));
app.use('/register', require('./routes/register'));

module.exports = app;
