// All prices are stored in dollars with 2-decimal precision.
const FREE_SHIPPING_THRESHOLD = 100;
const SHIPPING_RATES = { standard: 6.95, express: 14.95 };
const TAX_RATE = 0.08;

const round = (n) => Math.round(n * 100) / 100;

function calcTotals(items, shippingMethod = 'standard') {
  const itemsPrice = round(items.reduce((s, i) => s + i.price * i.qty, 0));
  let shippingPrice = SHIPPING_RATES[shippingMethod] ?? SHIPPING_RATES.standard;
  if (shippingMethod === 'standard' && itemsPrice >= FREE_SHIPPING_THRESHOLD) shippingPrice = 0;
  const taxPrice = round(itemsPrice * TAX_RATE);
  const totalPrice = round(itemsPrice + shippingPrice + taxPrice);
  return { itemsPrice, shippingPrice, taxPrice, totalPrice };
}

module.exports = { calcTotals, round, FREE_SHIPPING_THRESHOLD, SHIPPING_RATES, TAX_RATE };
