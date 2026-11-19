import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="container admin">
      <aside className="admin-nav">
        <div className="eyebrow">Admin</div>
        <NavLink end to="/admin">Dashboard</NavLink>
        <NavLink to="/admin/products">Products</NavLink>
        <NavLink to="/admin/orders">Orders</NavLink>
        <NavLink to="/admin/users">Customers</NavLink>
      </aside>
      <div className="admin-main"><Outlet /></div>
    </div>
  );
}
