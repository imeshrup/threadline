const Order = require('../models/Order');

// Idempotent: only transitions pending -> paid.
async function markOrderPaid(orderId, payment) {
  return Order.findOneAndUpdate(
    { _id: orderId, status: 'pending' },
    { $set: { status: 'paid', 'payment.paidAt': new Date(), ...Object.fromEntries(Object.entries(payment).map(([k, v]) => [`payment.${k}`, v])) } },
    { new: true }
  );
}

module.exports = { markOrderPaid };
