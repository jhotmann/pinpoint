const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authCookie = req.cookies.authorization;

  if (authCookie) {
    const token = authCookie;
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.sendStatus(403);
      req.user = decoded;
      next();
    });
  } else {
    res.redirect(301, '/login');
  }
};
