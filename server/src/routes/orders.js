const router = require('express').Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { calcTotals } = require('../utils/pricing');
const { reserveStock, releaseStock } = require('../utils/stock');
const { getStripe, isStripeEnabled } = require('../utils/stripe');
const { markOrderPaid } = require('../utils/markPaid');
const { protect, admin } = require('../middleware/auth');

const loadOwnOrder = async (req) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) throw new HttpError(404, 'Order not found');
  if (!order.user._id.equals(req.user._id) && !req.user.isAdmin) throw new HttpError(403, 'Not your order');
  return order;
};

router.get('/config', (req, res) => res.json({ stripeEnabled: isStripeEnabled() }));

// Create order: prices are always taken from the database, never from the client.
router.post(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const { items, shippingAddress, shippingMethod = 'standard' } = req.body;
    if (!Array.isArray(items) || !items.length) throw new HttpError(400, 'Your cart is empty');
    if (items.length > 50) throw new HttpError(400, 'Too many items');
    const required = ['fullName', 'line1', 'city', 'postalCode', 'country'];
    if (!shippingAddress || required.some((f) => !String(shippingAddress[f] || '').trim()))
      throw new HttpError(400, 'Please complete the shipping address');
    if (!['standard', 'express'].includes(shippingMethod)) throw new HttpError(400, 'Invalid shipping method');

    const products = await Product.find({ _id: { $in: items.map((i) => i.product) } });
    const byId = new Map(products.map((p) => [String(p._id), p]));
    const orderItems = items.map((i) => {
      const p = byId.get(String(i.product));
      const qty = parseInt(i.qty, 10);
      if (!p) throw new HttpError(400, 'A product in your cart is no longer available');
      if (!(qty > 0 && qty <= 20)) throw new HttpError(400, 'Invalid quantity');
      if (!p.variants.some((v) => v.size === i.size && v.color === i.color))
        throw new HttpError(400, `"${p.name}" is not available in ${i.color} / ${i.size}`);
      return { product: p._id, name: p.name, image: p.images[0], price: p.price, size: i.size, color: i.color, qty };
    });

    await reserveStock(orderItems);
    try {
      const order = await Order.create({
        user: req.user._id,
        items: orderItems,
        shippingAddress,
        shippingMethod,
        ...calcTotals(orderItems, shippingMethod),
        stockReserved: true,
      });
      res.status(201).json(order);
    } catch (err) {
      await releaseStock(orderItems);
      throw err;
    }
  })
);

router.get(
  '/mine',
  protect,
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  })
);

router.get('/:id', protect, asyncHandler(async (req, res) => res.json(await loadOwnOrder(req))));

// Start payment. With Stripe configured -> Checkout Session URL; otherwise simulated payment.
router.post(
  '/:id/pay',
  protect,
  asyncHandler(async (req, res) => {
    const order = await loadOwnOrder(req);
    if (order.status !== 'pending') throw new HttpError(400, `Order is already ${order.status}`);

    const stripe = getStripe();
    if (!stripe) {
      const paid = await markOrderPaid(order._id, { provider: 'simulated' });
      return res.json({ simulated: true, order: paid });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const toCents = (n) => Math.round(n * 100);
    const absolute = (img) => (img && /^https?:\/\//.test(img) ? [img] : undefined);
    const lineItems = order.items.map((i) => ({
      quantity: i.qty,
      price_data: {
        currency: 'usd',
        unit_amount: toCents(i.price),
        product_data: { name: `${i.name} (${i.color} / ${i.size})`, images: absolute(i.image) },
      },
    }));
    if (order.taxPrice > 0)
      lineItems.push({ quantity: 1, price_data: { currency: 'usd', unit_amount: toCents(order.taxPrice), product_data: { name: 'Sales tax' } } });
    if (order.shippingPrice > 0)
      lineItems.push({
        quantity: 1,
        price_data: { currency: 'usd', unit_amount: toCents(order.shippingPrice), product_data: { name: `${order.shippingMethod} shipping` } },
      });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer_email: order.user.email,
      client_reference_id: String(order._id),
      metadata: { orderId: String(order._id) },
      success_url: `${clientUrl}/order/${order._id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/order/${order._id}?canceled=1`,
    });
    order.payment = { provider: 'stripe', sessionId: session.id };
    await order.save();
    res.json({ url: session.url });
  })
);

// Called by the success page so payment is confirmed even without a webhook (e.g. local dev).
router.post(
  '/:id/verify-payment',
  protect,
  asyncHandler(async (req, res) => {
    const order = await loadOwnOrder(req);
    const stripe = getStripe();
    if (order.status !== 'pending' || !stripe || !order.payment?.sessionId) return res.json(order);
    const session = await stripe.checkout.sessions.retrieve(order.payment.sessionId);
    if (session.payment_status === 'paid') {
      const paid = await markOrderPaid(order._id, { paymentIntentId: session.payment_intent });
      return res.json(paid || (await Order.findById(order._id)));
    }
    res.json(order);
  })
);

router.post(
  '/:id/cancel',
  protect,
  asyncHandler(async (req, res) => {
    const order = await loadOwnOrder(req);
    if (order.status !== 'pending' && !(req.user.isAdmin && order.status === 'paid'))
      throw new HttpError(400, 'Only unpaid orders can be cancelled');
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      { status: 'cancelled', stockReserved: false },
      { new: true }
    );
    if (!updated) throw new HttpError(409, 'Order changed, please refresh');
    if (order.stockReserved) await releaseStock(order.items);
    res.json(updated);
  })
);

// ---------- Admin ----------
router.get(
  '/',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 20;
    const filter = req.query.status ? { status: req.query.status } : {};
    const [orders, total] = await Promise.all([
      Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Order.countDocuments(filter),
    ]);
    res.json({ orders, page, pages: Math.ceil(total / limit) || 1, total });
  })
);

router.put(
  '/:id/status',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const { status, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) throw new HttpError(404, 'Order not found');
    const allowed = { paid: ['shipped'], shipped: ['delivered'] };
    if (!(allowed[order.status] || []).includes(status))
      throw new HttpError(400, `Cannot change order from ${order.status} to ${status}`);
    order.status = status;
    if (status === 'shipped') {
      order.shippedAt = new Date();
      if (trackingNumber) order.trackingNumber = trackingNumber;
    }
    if (status === 'delivered') order.deliveredAt = new Date();
    await order.save();
    res.json(order);
  })
);

module.exports = router;
