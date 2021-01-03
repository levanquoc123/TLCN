const admin = (req, res, next) => {
  if (req.user.role === 0) {
    return res.send("You are not allowed, get out now.");
  }
  next();
};

module.exports = { admin };
