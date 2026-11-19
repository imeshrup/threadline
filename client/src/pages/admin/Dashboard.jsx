import { useState } from 'react';
import { Link } from 'react-router-dom';
import useFetch from '../../lib/useFetch';
import { date, money, shortId } from '../../lib/format';
import { Alert, Spinner, StatusBadge } from '../../components/ui';

export default function Dashboard() {
  const { data, loading, error } = useFetch('/admin/stats');
  if (loading) return <Spinner />;
  if (error) return <Alert>{error}</Alert>;
  const s = data;
  const last30 = s.series.reduce((sum, d) => sum + d.revenue, 0);
  const avg = s.paidOrders ? s.revenue / s.paidOrders : 0;

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stat-row">
        <Stat label="Total revenue" value={money(s.revenue)} />
        <Stat label="Last 30 days" value={money(last30)} />
        <Stat label="Paid orders" value={s.paidOrders} sub={`${s.ordersByStatus.paid || 0} awaiting shipment`} />
        <Stat label="Avg. order value" value={money(avg)} />
        <Stat label="Customers" value={s.users} />
      </div>

      <section className="panel">
        <h2>Revenue · last 30 days</h2>
        <RevenueChart series={s.series} />
      </section>

      <div className="dash-grid">
        <section className="panel">
          <div className="row-between"><h2>Recent orders</h2><Link to="/admin/orders">All orders →</Link></div>
          <table className="table compact">
            <tbody>
              {s.recentOrders.map((o) => (
                <tr key={o._id}>
                  <td><Link to={`/order/${o._id}`}>#{shortId(o._id)}</Link></td>
                  <td>{o.user?.name || 'Deleted user'}</td>
                  <td className="muted">{date(o.createdAt)}</td>
                  <td>{money(o.totalPrice)}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>Top sellers</h2>
          <ul className="rank-list">
            {s.topProducts.map((p) => (
              <li key={p._id}><img src={p.image} alt="" /><span className="grow">{p.name}</span><span className="muted">{p.units} sold</span><b>{money(p.revenue)}</b></li>
            ))}
          </ul>
          <h2>Low stock</h2>
          {s.lowStock.length === 0 ? <p className="muted">All products are well stocked.</p> : (
            <ul className="rank-list">
              {s.lowStock.map((p) => (
                <li key={p._id}><img src={p.images[0]} alt="" /><Link className="grow" to={`/admin/products/${p._id}`}>{p.name}</Link><span className={p.totalStock === 0 ? 'text-danger' : 'text-warn'}>{p.totalStock} left</span></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

const Stat = ({ label, value, sub }) => (
  <div className="stat"><div className="muted small">{label}</div><div className="stat-value">{value}</div>{sub && <div className="muted small">{sub}</div>}</div>
);

function RevenueChart({ series }) {
  const [hover, setHover] = useState(null);
  const W = 720; const H = 220; const pad = { l: 48, r: 8, t: 12, b: 26 };
  const max = Math.max(50, ...series.map((d) => d.revenue));
  const nice = Math.ceil(max / 100) * 100;
  const bw = (W - pad.l - pad.r) / series.length;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / nice);
  const ticks = [0, 0.5, 1].map((f) => Math.round(nice * f));
  const h = hover !== null ? series[hover] : null;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily revenue for the last 30 days" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid-line" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="axis">${t}</text>
          </g>
        ))}
        {series.map((d, i) => (
          <g key={d.date} onMouseEnter={() => setHover(i)}>
            <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
            <rect x={pad.l + i * bw + 2} y={y(d.revenue)} width={Math.max(1, bw - 4)} height={Math.max(0, H - pad.b - y(d.revenue))} rx="2" className={`bar-rect ${hover === i ? 'on' : ''}`} />
            {i % 5 === 0 && <text x={pad.l + i * bw + bw / 2} y={H - 8} textAnchor="middle" className="axis">{d.date.slice(5)}</text>}
          </g>
        ))}
      </svg>
      <div className="chart-tip">{h ? <><b>{date(h.date + 'T12:00:00')}</b> · {money(h.revenue)} · {h.orders} order{h.orders !== 1 && 's'}</> : <span className="muted">Hover a bar for details</span>}</div>
    </div>
  );
}
