const cookieParser = require('cookie-parser');
const express = require('express');
const logger = require('morgan');
const nunjucks = require('nunjucks');
const path = require('path');
const auth = require('./src/jwtAuth');
const isAdmin = require('./src/adminAuth');

require('dotenv').config();

require('./src/mqtt');

const app = express();
nunjucks.configure('views', { express: app, autoescape: true });
if (process.env.BEHIND_PROXY === 'true') app.set('trust proxy', true);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/styles/css', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist', 'css')));
app.use('/styles/js', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist', 'js')));

app.use('/', require('./routes/index'));
app.use('/login', require('./routes/login'));
app.use('/logout', auth, require('./routes/logout'));
app.use('/admin', auth, isAdmin, require('./routes/admin'));
app.use('/user', auth, require('./routes/user'));
app.use('/register', require('./routes/register'));

module.exports = app;
