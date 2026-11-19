import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { money, FREE_SHIPPING } from '../lib/format';
import { QtyStepper } from './ui';

export default function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, update, remove, subtotal, lineKey } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setDrawerOpen]);

  const remaining = FREE_SHIPPING - subtotal;
  const go = (to) => { setDrawerOpen(false); navigate(to); };

  return (
    <>
      <div className={`overlay ${drawerOpen ? 'show' : ''}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`drawer ${drawerOpen ? 'open' : ''}`} aria-hidden={!drawerOpen} aria-label="Shopping cart">
        <div className="drawer-head">
          <h2>Your bag</h2>
          <button className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="Close cart">✕</button>
        </div>
        {items.length === 0 ? (
          <div className="drawer-empty">
            <p>Your bag is empty.</p>
            <button className="btn" onClick={() => go('/shop')}>Start shopping</button>
          </div>
        ) : (
          <>
            <div className="ship-progress">
              {remaining > 0 ? <>You're <b>{money(remaining)}</b> away from free shipping</> : <>You've unlocked <b>free shipping</b></>}
              <div className="bar"><span style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING) * 100)}%` }} /></div>
            </div>
            <ul className="drawer-items">
              {items.map((i) => (
                <li key={lineKey(i)}>
                  <Link to={`/product/${i.slug}`} onClick={() => setDrawerOpen(false)}><img src={i.image} alt="" /></Link>
                  <div>
                    <div className="line-name">{i.name}</div>
                    <div className="muted small">{i.color} · {i.size}</div>
                    <div className="line-row">
                      <QtyStepper value={i.qty} max={i.maxStock} onChange={(q) => update(lineKey(i), q)} />
                      <span>{money(i.price * i.qty)}</span>
                    </div>
                    <button className="link-btn small" onClick={() => remove(lineKey(i))}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="drawer-foot">
              <div className="row-between"><span>Subtotal</span><b>{money(subtotal)}</b></div>
              <p className="muted small">Shipping and taxes calculated at checkout.</p>
              <button className="btn btn-block" onClick={() => go('/checkout')}>Checkout</button>
              <button className="btn btn-ghost btn-block" onClick={() => go('/cart')}>View bag</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
