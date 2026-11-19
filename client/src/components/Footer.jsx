import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="logo">Threadline</div>
          <p className="muted">Thoughtfully made clothing, built to be worn for years.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/shop?gender=women">Women</Link>
          <Link to="/shop?gender=men">Men</Link>
          <Link to="/shop?category=accessories">Accessories</Link>
          <Link to="/shop?sale=true">Sale</Link>
        </div>
        <div>
          <h4>Help</h4>
          <Link to="/account/orders">Track an order</Link>
          <span>Shipping &amp; returns</span>
          <span>Size guide</span>
        </div>
        <div>
          <h4>Stay in touch</h4>
          <p className="muted small">New arrivals and members-only offers.</p>
          <form className="newsletter" onSubmit={(e) => { e.preventDefault(); e.target.reset(); }}>
            <input type="email" required placeholder="Email address" aria-label="Email address" />
            <button className="btn">Join</button>
          </form>
        </div>
      </div>
      <div className="container footer-bottom muted small">© {new Date().getFullYear()} Threadline. All rights reserved.</div>
    </footer>
  );
}
