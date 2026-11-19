import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import useFetch from '../lib/useFetch';
import { date, money, shortId } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert, Empty, Spinner, StatusBadge } from '../components/ui';

const STEPS = ['pending', 'paid', 'shipped', 'delivered'];

export default function Order() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data: order, loading, error, setData } = useFetch(`/orders/${id}`);
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState('');
  const [actionError, setActionError] = useState('');

  // Returning from Stripe Checkout: confirm the payment server-side.
  useEffect(() => {
    if (params.get('session_id')) api(`/orders/${id}/verify-payment`, { method: 'POST' }).then(setData).catch(() => {});
  }, [id, params, setData]);

  if (loading) return <Spinner />;
  if (error) return <div className="container"><Empty title="Order not found" text={error} to="/account/orders" cta="My orders" /></div>;

  const act = async (fn, msg) => {
    setBusy(true);
    setActionError('');
    try {
      const res = await fn();
      setData((prev) => ({ ...prev, ...(res.order || res), user: prev.user }));
      if (res.url) return (window.location.href = res.url);
      toast(msg);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const pay = () => act(() => api(`/orders/${id}/pay`, { method: 'POST' }), 'Payment received');
  const cancel = () => window.confirm('Cancel this order?') && act(() => api(`/orders/${id}/cancel`, { method: 'POST' }), 'Order cancelled');
  const setStatus = (status) => act(() => api(`/orders/${id}/status`, { method: 'PUT', body: { status, trackingNumber: tracking } }), `Marked as ${status}`);

  const stepIdx = STEPS.indexOf(order.status);
  const a = order.shippingAddress;

  return (
    <div className="container page narrow">
      {params.get('placed') && order.status === 'paid' && <Alert type="success">Thank you! Your order has been placed.</Alert>}
      {params.get('session_id') && order.status === 'paid' && <Alert type="success">Payment successful. Thank you for your order!</Alert>}
      {params.get('canceled') && order.status === 'pending' && <Alert type="info">Payment was cancelled. You can try again below.</Alert>}

      <div className="row-between wrap">
        <div>
          <h1>Order #{shortId(order._id)}</h1>
          <p className="muted">Placed {date(order.createdAt)}{user.isAdmin && order.user?.email && <> by {order.user.name} ({order.user.email})</>}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.status !== 'cancelled' && (
        <ol className="tracker">
          {STEPS.map((s, i) => <li key={s} className={i <= stepIdx ? 'done' : ''}><span />{s}</li>)}
        </ol>
      )}
      {order.trackingNumber && <p>Tracking number: <b>{order.trackingNumber}</b></p>}

      <Alert>{actionError}</Alert>
      {order.status === 'pending' && (
        <div className="panel row-between wrap">
          <span>This order is awaiting payment.</span>
          <div className="actions">
            <button className="btn btn-ghost" onClick={cancel} disabled={busy}>Cancel order</button>
            <button className="btn" onClick={pay} disabled={busy}>Pay {money(order.totalPrice)}</button>
          </div>
        </div>
      )}

      {user.isAdmin && ['paid', 'shipped'].includes(order.status) && (
        <div className="panel admin-panel">
          <h3>Admin actions</h3>
          {order.status === 'paid' && (
            <div className="actions">
              <input placeholder="Tracking number (optional)" value={tracking} onChange={(e) => setTracking(e.target.value)} />
              <button className="btn" disabled={busy} onClick={() => setStatus('shipped')}>Mark as shipped</button>
              <button className="btn btn-ghost" disabled={busy} onClick={cancel}>Cancel &amp; restock</button>
            </div>
          )}
          {order.status === 'shipped' && <button className="btn" disabled={busy} onClick={() => setStatus('delivered')}>Mark as delivered</button>}
        </div>
      )}

      <div className="two-col">
        <ul className="cart-list">
          {order.items.map((i, idx) => (
            <li key={idx}>
              <img src={i.image} alt="" />
              <div className="grow">
                <div className="line-name">{i.name}</div>
                <div className="muted small">{i.color} · {i.size} · Qty {i.qty}</div>
              </div>
              <b>{money(i.price * i.qty)}</b>
            </li>
          ))}
        </ul>
        <aside className="summary">
          <h2>Summary</h2>
          <div className="row-between"><span>Items</span><span>{money(order.itemsPrice)}</span></div>
          <div className="row-between"><span>Shipping ({order.shippingMethod})</span><span>{order.shippingPrice ? money(order.shippingPrice) : 'Free'}</span></div>
          <div className="row-between"><span>Tax</span><span>{money(order.taxPrice)}</span></div>
          <div className="row-between total"><span>Total</span><span>{money(order.totalPrice)}</span></div>
          <h3>Ship to</h3>
          <address>{a.fullName}<br />{a.line1}{a.line2 && <>, {a.line2}</>}<br />{a.city} {a.postalCode}<br />{a.country}</address>
          {order.payment?.paidAt && <p className="muted small">Paid {date(order.payment.paidAt)} via {order.payment.provider}</p>}
        </aside>
      </div>
      <Link to={user.isAdmin ? '/admin/orders' : '/account/orders'} className="link-btn">← Back to orders</Link>
    </div>
  );
}
