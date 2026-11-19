import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const NAV = [
  ['New In', '/shop?sort=newest'],
  ['Women', '/shop?gender=women'],
  ['Men', '/shop?gender=men'],
  ['Outerwear', '/shop?category=outerwear'],
  ['Accessories', '/shop?category=accessories'],
  ['Sale', '/shop?sale=true'],
];

export default function Header() {
  const { user, logout } = useAuth();
  const { count, setDrawerOpen } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    setUserOpen(false);
  }, [location]);

  const onSearch = (e) => {
    e.preventDefault();
    navigate(`/shop?q=${encodeURIComponent(q.trim())}`);
    setQ('');
  };

  return (
    <header className="header">
      <div className="promo">Free standard shipping on orders over $100 · Free 30-day returns</div>
      <div className="header-inner container">
        <button className="icon-btn menu-toggle" aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>☰</button>
        <Link to="/" className="logo">Threadline</Link>
        <nav className={`main-nav ${menuOpen ? 'open' : ''}`}>
          {NAV.map(([label, to]) => (
            <NavLink key={label} to={to} className={label === 'Sale' ? 'nav-sale' : ''}>{label}</NavLink>
          ))}
        </nav>
        <form className="search" onSubmit={onSearch} role="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search products" />
        </form>
        <div className="header-actions">
          {user ? (
            <div className="user-menu">
              <button className="icon-btn" onClick={() => setUserOpen((o) => !o)} aria-expanded={userOpen}>
                <span className="avatar">{user.name[0]}</span>
              </button>
              {userOpen && (
                <div className="dropdown">
                  <div className="dropdown-head">Hi, {user.name.split(' ')[0]}</div>
                  <Link to="/account">My account</Link>
                  <Link to="/account/orders">Orders</Link>
                  <Link to="/wishlist">Wishlist</Link>
                  {user.isAdmin && <Link to="/admin">Admin dashboard</Link>}
                  <button onClick={() => { logout(); navigate('/'); }}>Log out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="link-btn">Sign in</Link>
          )}
          <button className="icon-btn cart-btn" onClick={() => setDrawerOpen(true)} aria-label={`Cart, ${count} items`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 7h14l-1.2 12.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
            {count > 0 && <span className="count">{count}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
