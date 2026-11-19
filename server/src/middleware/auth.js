const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Not authorized, please log in');
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Session expired, please log in again');
  }
  const user = await User.findById(payload.id);
  if (!user) throw new HttpError(401, 'User no longer exists');
  req.user = user;
  next();
});

const admin = (req, res, next) => {
  if (!req.user?.isAdmin) return next(new HttpError(403, 'Admin access required'));
  next();
};

module.exports = { protect, admin, signToken };
