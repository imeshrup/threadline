import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { estimateTotals, money, SHIPPING, FREE_SHIPPING } from '../lib/format';
import { Alert } from '../components/ui';

const FIELDS = [
  ['fullName', 'Full name', true, 'name'],
  ['line1', 'Address', true, 'address-line1'],
  ['line2', 'Apartment, suite (optional)', false, 'address-line2'],
  ['city', 'City', true, 'address-level2'],
  ['postalCode', 'Postal code', true, 'postal-code'],
  ['country', 'Country', true, 'country-name'],
  ['phone', 'Phone (optional)', false, 'tel'],
];

export default function Checkout() {
  const { items, subtotal, clear, lineKey } = useCart();
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState(() => ({ fullName: user.name, country: 'United States', ...(user.address || {}) }));
  const [method, setMethod] = useState('standard');
  const [save, setSave] = useState(!user.address);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(null);

  useEffect(() => { api('/orders/config').then((c) => setStripeEnabled(c.stripeEnabled)).catch(() => setStripeEnabled(false)); }, []);

  if (!items.length) return <Navigate to="/cart" replace />;
  const t = estimateTotals(subtotal, method);

  const placeOrder = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (save) await updateProfile({ address });
      const order = await api('/orders', {
        method: 'POST',
        body: { items: items.map(({ product, size, color, qty }) => ({ product, size, color, qty })), shippingAddress: address, shippingMethod: method },
      });
      clear();
      const pay = await api(`/orders/${order._id}/pay`, { method: 'POST' });
      if (pay.url) window.location.href = pay.url; // Stripe Checkout
      else navigate(`/order/${order._id}?placed=1`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <h1>Checkout</h1>
      <form className="two-col" onSubmit={placeOrder}>
        <div>
          <section className="panel">
            <h2>Shipping address</h2>
            <div className="form-grid">
              {FIELDS.map(([k, label, req, ac]) => (
                <label key={k} className={`field ${['fullName', 'line1', 'line2'].includes(k) ? 'span-2' : ''}`}>
                  <span>{label}</span>
                  <input required={req} autoComplete={ac} value={address[k] || ''} onChange={(e) => setAddress({ ...address, [k]: e.target.value })} />
                </label>
              ))}
            </div>
            <label className="check"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /> Save this address to my account</label>
          </section>

          <section className="panel">
            <h2>Delivery</h2>
            {[
              ['standard', 'Standard', '3–5 business days', subtotal >= FREE_SHIPPING ? 'Free' : money(SHIPPING.standard)],
              ['express', 'Express', '1–2 business days', money(SHIPPING.express)],
            ].map(([v, label, eta, price]) => (
              <label key={v} className={`radio-card ${method === v ? 'on' : ''}`}>
                <input type="radio" name="ship" value={v} checked={method === v} onChange={() => setMethod(v)} />
                <span className="grow"><b>{label}</b><br /><span className="muted small">{eta}</span></span>
                <span>{price}</span>
              </label>
            ))}
          </section>

          <section className="panel">
            <h2>Payment</h2>
            {stripeEnabled ? (
              <p className="muted">You'll be redirected to Stripe's secure checkout to complete payment.</p>
            ) : (
              <Alert type="info">Demo mode: Stripe isn't configured, so payment is simulated and your order will be marked as paid immediately. Add <code>STRIPE_SECRET_KEY</code> to the server's .env to enable real checkout.</Alert>
            )}
          </section>
        </div>

        <aside className="summary">
          <h2>Order summary</h2>
          <ul className="mini-lines">
            {items.map((i) => (
              <li key={lineKey(i)}>
                <span className="thumb"><img src={i.image} alt="" /><span className="qty-dot">{i.qty}</span></span>
                <span className="grow">{i.name}<br /><span className="muted small">{i.color} · {i.size}</span></span>
                <span>{money(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="row-between"><span>Subtotal</span><span>{money(t.subtotal)}</span></div>
          <div className="row-between"><span>Shipping</span><span>{t.shipping ? money(t.shipping) : 'Free'}</span></div>
          <div className="row-between"><span>Tax (8%)</span><span>{money(t.tax)}</span></div>
          <div className="row-between total"><span>Total</span><span>{money(t.total)}</span></div>
          <Alert>{error}</Alert>
          <button className="btn btn-block btn-lg" disabled={busy}>{busy ? 'Placing order…' : stripeEnabled ? 'Continue to payment' : `Place order · ${money(t.total)}`}</button>
        </aside>
      </form>
    </div>
  );
}
