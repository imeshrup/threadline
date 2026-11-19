const router = require('express').Router();
const User = require('../models/User');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { protect, admin } = require('../middleware/auth');

// Wishlist
router.get(
  '/wishlist',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate({ path: 'wishlist', select: '-reviews' });
    res.json(user.wishlist.filter(Boolean));
  })
);

router.post(
  '/wishlist/:productId',
  protect,
  asyncHandler(async (req, res) => {
    await User.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: req.params.productId } });
    res.json({ ok: true });
  })
);

router.delete(
  '/wishlist/:productId',
  protect,
  asyncHandler(async (req, res) => {
    await User.updateOne({ _id: req.user._id }, { $pull: { wishlist: req.params.productId } });
    res.json({ ok: true });
  })
);

// ---------- Admin ----------
router.get(
  '/',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const users = await User.find().sort({ createdAt: -1 });
    const counts = await Order.aggregate([
      { $match: { status: { $in: ['paid', 'shipped', 'delivered'] } } },
      { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$totalPrice' } } },
    ]);
    const byUser = new Map(counts.map((c) => [String(c._id), c]));
    res.json(users.map((u) => ({ ...u.toJSON(), orders: byUser.get(String(u._id))?.orders || 0, spent: byUser.get(String(u._id))?.spent || 0 })));
  })
);

router.put(
  '/:id',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new HttpError(404, 'User not found');
    if (user._id.equals(req.user._id) && req.body.isAdmin === false) throw new HttpError(400, "You can't remove your own admin access");
    if (typeof req.body.isAdmin === 'boolean') user.isAdmin = req.body.isAdmin;
    await user.save();
    res.json(user);
  })
);

router.delete(
  '/:id',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    if (req.params.id === String(req.user._id)) throw new HttpError(400, "You can't delete yourself");
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new HttpError(404, 'User not found');
    res.json({ message: 'User deleted' });
  })
);

module.exports = router;
