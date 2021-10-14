const db = require('./database');

module.exports = async (req, res, next) => {
  if (req.user.username === 'admin') {
    next();
  } else {
    const userData = await db.getUserByName(req.user.username);
    if (userData?.isAdmin) {
      next();
    } else {
      res.sendStatus(403);
    }
  }
};
