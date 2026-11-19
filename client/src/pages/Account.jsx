import { useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useFetch from '../lib/useFetch';
import { date, money, shortId } from '../lib/format';
import { Alert, Empty, Spinner, StatusBadge } from '../components/ui';
import ProductCard from '../components/ProductCard';

export default function Account() {
  return (
    <div className="container page">
      <h1>My account</h1>
      <div className="tabs">
        <NavLink end to="/account">Profile</NavLink>
        <NavLink to="/account/orders">Orders</NavLink>
        <NavLink to="/wishlist">Wishlist</NavLink>
      </div>
      <Routes>
        <Route index element={<Profile />} />
        <Route path="orders" element={<Orders />} />
      </Routes>
    </div>
  );
}

function Profile() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, email: user.email, currentPassword: '', password: '' });
  const [address, setAddress] = useState(user.address || {});
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { name: form.name, email: form.email, address };
      if (form.password) Object.assign(body, { password: form.password, currentPassword: form.currentPassword });
      await updateProfile(body);
      setForm((f) => ({ ...f, password: '', currentPassword: '' }));
      toast('Profile updated');
    } catch (err) {
      setError(err.message);
    }
  };

  const af = (k, label, span) => (
    <label className={`field ${span ? 'span-2' : ''}`}><span>{label}</span>
      <input value={address[k] || ''} onChange={(e) => setAddress({ ...address, [k]: e.target.value })} />
    </label>
  );

  return (
    <form className="profile-grid" onSubmit={submit}>
      <section className="panel">
        <h2>Details</h2>
        <label className="field"><span>Name</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="field"><span>Email</span><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <h3>Change password</h3>
        <label className="field"><span>Current password</span><input type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /></label>
        <label className="field"><span>New password</span><input type="password" minLength={6} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
      </section>
      <section className="panel">
        <h2>Default address</h2>
        <div className="form-grid">
          {af('fullName', 'Full name', true)}
          {af('line1', 'Address', true)}
          {af('line2', 'Apartment, suite', true)}
          {af('city', 'City')}
          {af('postalCode', 'Postal code')}
          {af('country', 'Country')}
          {af('phone', 'Phone')}
        </div>
      </section>
      <div className="span-2">
        <Alert>{error}</Alert>
        <button className="btn btn-lg">Save changes</button>
      </div>
    </form>
  );
}

function Orders() {
  const { data, loading, error } = useFetch('/orders/mine');
  if (loading) return <Spinner />;
  if (error) return <Alert>{error}</Alert>;
  if (!data.length) return <Empty title="No orders yet" text="When you place an order it will show up here." to="/shop" cta="Start shopping" />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th /></tr></thead>
        <tbody>
          {data.map((o) => (
            <tr key={o._id}>
              <td>#{shortId(o._id)}</td>
              <td>{date(o.createdAt)}</td>
              <td>{o.items.reduce((s, i) => s + i.qty, 0)}</td>
              <td>{money(o.totalPrice)}</td>
              <td><StatusBadge status={o.status} /></td>
              <td><Link to={`/order/${o._id}`}>View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Wishlist() {
  const { data, loading, error } = useFetch('/users/wishlist');
  return (
    <div className="container page">
      <h1>Wishlist</h1>
      {loading ? <Spinner /> : error ? <Alert>{error}</Alert> : data.length ? (
        <div className="grid">{data.map((p) => <ProductCard key={p._id} product={p} />)}</div>
      ) : (
        <Empty title="Nothing saved yet" text="Tap the heart on any product to save it here." to="/shop" cta="Browse products" />
      )}
    </div>
  );
}
