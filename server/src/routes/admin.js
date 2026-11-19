const router = require('express').Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { protect, admin } = require('../middleware/auth');

const PAID = ['paid', 'shipped', 'delivered'];

router.get(
  '/stats',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 29);

    const [revenue, orderCounts, users, products, daily, topProducts, recentOrders, lowStock] = await Promise.all([
      Order.aggregate([{ $match: { status: { $in: PAID } } }, { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.countDocuments(),
      Product.countDocuments(),
      Order.aggregate([
        { $match: { status: { $in: PAID }, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$totalPrice' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { status: { $in: PAID } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', name: { $first: '$items.name' }, image: { $first: '$items.image' }, units: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } } } },
        { $sort: { units: -1 } },
        { $limit: 5 },
      ]),
      Order.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(6),
      Product.aggregate([
        { $project: { name: 1, slug: 1, images: 1, totalStock: { $sum: '$variants.stock' } } },
        { $match: { totalStock: { $lt: 15 } } },
        { $sort: { totalStock: 1 } },
        { $limit: 6 },
      ]),
    ]);

    // Fill missing days with zero so the chart has a continuous axis
    const byDay = new Map(daily.map((d) => [d._id, d]));
    const series = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      series.push({ date: key, revenue: Math.round((byDay.get(key)?.revenue || 0) * 100) / 100, orders: byDay.get(key)?.orders || 0 });
    }

    res.json({
      revenue: revenue[0]?.total || 0,
      paidOrders: revenue[0]?.count || 0,
      ordersByStatus: Object.fromEntries(orderCounts.map((o) => [o._id, o.count])),
      users,
      products,
      series,
      topProducts,
      recentOrders,
      lowStock,
    });
  })
);

module.exports = router;
