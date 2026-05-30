const jwt = require('jsonwebtoken');
const config = require('./config');

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function authorizeSelf(req, res, next) {
  const targetId = req.params.userId;
  if (targetId != null && String(req.user.id) !== String(targetId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

function authUserId(req) {
  return Number(req.user.id);
}

/** Reject if body.userId is present and does not match the JWT user. */
function rejectMismatchedBodyUser(req, res, next) {
  if (req.body?.userId != null && String(req.body.userId) !== String(req.user.id)) {
    return res.status(403).json({
      error: 'Session user mismatch. Sign out and sign in again.',
    });
  }
  next();
}

module.exports = { authenticate, authorizeSelf, authUserId, rejectMismatchedBodyUser };
