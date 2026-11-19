let client;
const isStripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);
const getStripe = () => {
  if (!isStripeEnabled()) return null;
  if (!client) client = require('stripe')(process.env.STRIPE_SECRET_KEY);
  return client;
};
module.exports = { getStripe, isStripeEnabled };
