const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { protect, signToken } = require('../middleware/auth');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

const authResponse = (user) => ({ user, token: signToken(user._id) });

router.post(
  '/register',
  limiter,
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) throw new HttpError(400, 'Name, email and password are required');
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Please enter a valid email');
    if (await User.exists({ email: email.toLowerCase() })) throw new HttpError(409, 'An account with that email already exists');
    const user = await User.create({ name, email, password });
    res.status(201).json(authResponse(user));
  })
);

router.post(
  '/login',
  limiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw new HttpError(400, 'Email and password are required');
    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password))) throw new HttpError(401, 'Invalid email or password');
    res.json(authResponse(user));
  })
);

router.get('/me', protect, (req, res) => res.json(req.user));

router.put(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('+password');
    const { name, email, password, currentPassword, address } = req.body;
    if (name) user.name = name;
    if (email && email.toLowerCase() !== user.email) {
      if (await User.exists({ email: email.toLowerCase() })) throw new HttpError(409, 'Email already in use');
      user.email = email;
    }
    if (password) {
      if (!currentPassword || !(await user.matchPassword(currentPassword)))
        throw new HttpError(400, 'Current password is incorrect');
      if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
      user.password = password;
    }
    if (address) user.address = address;
    await user.save();
    res.json(authResponse(user));
  })
);

module.exports = router;
