import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { estimateTotals, money } from '../lib/format';
import { Empty, QtyStepper } from '../components/ui';

export default function Cart() {
  const { items, update, remove, subtotal, lineKey } = useCart();
  if (!items.length) return <div className="container"><Empty title="Your bag is empty" text="Find something you love." to="/shop" cta="Shop now" /></div>;
  const t = estimateTotals(subtotal);
  return (
    <div className="container page">
      <h1>Your bag</h1>
      <div className="two-col">
        <ul className="cart-list">
          {items.map((i) => (
            <li key={lineKey(i)}>
              <Link to={`/product/${i.slug}`}><img src={i.image} alt="" /></Link>
              <div className="grow">
                <Link to={`/product/${i.slug}`} className="line-name">{i.name}</Link>
                <div className="muted small">{i.color} · {i.size} · {money(i.price)}</div>
                <button className="link-btn small" onClick={() => remove(lineKey(i))}>Remove</button>
              </div>
              <QtyStepper value={i.qty} max={i.maxStock} onChange={(q) => update(lineKey(i), q)} />
              <b className="line-total">{money(i.price * i.qty)}</b>
            </li>
          ))}
        </ul>
        <aside className="summary">
          <h2>Order summary</h2>
          <div className="row-between"><span>Subtotal</span><span>{money(t.subtotal)}</span></div>
          <div className="row-between"><span>Est. shipping</span><span>{t.shipping ? money(t.shipping) : 'Free'}</span></div>
          <div className="row-between"><span>Est. tax</span><span>{money(t.tax)}</span></div>
          <div className="row-between total"><span>Total</span><span>{money(t.total)}</span></div>
          <Link to="/checkout" className="btn btn-block btn-lg">Checkout</Link>
          <Link to="/shop" className="link-btn center">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
