const express = require('express');
const { getStripe } = require('../utils/stripe');
const { markOrderPaid } = require('../utils/markPaid');

const router = express.Router();

// Must receive the raw body for signature verification (mounted before express.json()).
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(400).send('Stripe webhook not configured');
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    if (session.payment_status === 'paid' && session.metadata?.orderId) {
      await markOrderPaid(session.metadata.orderId, { paymentIntentId: session.payment_intent });
    }
  }
  res.json({ received: true });
});

module.exports = router;
