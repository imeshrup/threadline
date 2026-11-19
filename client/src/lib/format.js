const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const money = (n) => usd.format(n || 0);
export const date = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
export const shortId = (id) => String(id).slice(-8).toUpperCase();
export const CATEGORY_LABELS = {
  tops: 'Tops', bottoms: 'Bottoms', outerwear: 'Outerwear', dresses: 'Dresses', shoes: 'Shoes', accessories: 'Accessories',
};
// Mirrors server/src/utils/pricing.js for cart estimates; the server is the source of truth.
export const FREE_SHIPPING = 100;
export const SHIPPING = { standard: 6.95, express: 14.95 };
export const TAX_RATE = 0.08;
export const estimateTotals = (subtotal, method = 'standard') => {
  const shipping = method === 'standard' && subtotal >= FREE_SHIPPING ? 0 : SHIPPING[method];
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  return { subtotal, shipping, tax, total: Math.round((subtotal + shipping + tax) * 100) / 100 };
};
