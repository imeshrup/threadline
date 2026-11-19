import { useState } from 'react';
import { Link } from 'react-router-dom';
import useFetch from '../../lib/useFetch';
import { qs } from '../../lib/api';
import { date, money, shortId } from '../../lib/format';
import { Alert, Pagination, Spinner, StatusBadge } from '../../components/ui';

const STATUSES = ['', 'pending', 'paid', 'shipped', 'delivered', 'cancelled'];

export default function Orders() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useFetch(`/orders${qs({ status, page })}`);
  return (
    <>
      <h1>Orders</h1>
      <div className="tabs">
        {STATUSES.map((s) => (
          <button key={s || 'all'} className={status === s ? 'active' : ''} onClick={() => { setStatus(s); setPage(1); }}>{s || 'All'}</button>
        ))}
      </div>
      <Alert>{error}</Alert>
      {loading ? <Spinner /> : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o._id}>
                    <td>#{shortId(o._id)}</td>
                    <td>{o.user?.name || 'Deleted user'}<div className="muted small">{o.user?.email}</div></td>
                    <td>{date(o.createdAt)}</td>
                    <td>{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                    <td>{money(o.totalPrice)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td><Link to={`/order/${o._id}`} className="btn btn-sm btn-ghost">Manage</Link></td>
                  </tr>
                ))}
                {!data.orders.length && <tr><td colSpan={7} className="muted center">No orders</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}
    </>
  );
}
