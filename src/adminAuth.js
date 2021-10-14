module.exports = (req, res, next) => {
  if (req.user.username === 'admin') {
    next();
  } else {
    res.sendStatus(403);
  }
};
