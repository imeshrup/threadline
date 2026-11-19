import { Link } from 'react-router-dom';
import { money } from '../lib/format';

export const Spinner = ({ label = 'Loading' }) => (
  <div className="spinner-wrap" role="status"><span className="spinner" aria-hidden="true" /><span className="sr-only">{label}</span></div>
);

export const Alert = ({ children, type = 'error' }) => (children ? <div className={`alert alert-${type}`}>{children}</div> : null);

export function Stars({ value = 0, size = 14 }) {
  return (
    <span className="stars" aria-label={`${value} out of 5 stars`} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={value >= i - 0.25 ? 'on' : value >= i - 0.75 ? 'half' : ''}>★</span>
      ))}
    </span>
  );
}

export function Price({ price, compareAtPrice }) {
  const onSale = compareAtPrice && compareAtPrice > price;
  return (
    <span className="price">
      <span className={onSale ? 'sale' : ''}>{money(price)}</span>
      {onSale && <s>{money(compareAtPrice)}</s>}
    </span>
  );
}

export const StatusBadge = ({ status }) => <span className={`badge badge-${status}`}>{status}</span>;

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button className="btn btn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Prev</button>
      <span>Page {page} of {pages}</span>
      <button className="btn btn-ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next →</button>
    </nav>
  );
}

export function QtyStepper({ value, onChange, max = 20 }) {
  return (
    <div className="qty">
      <button type="button" aria-label="Decrease quantity" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1}>−</button>
      <span>{value}</span>
      <button type="button" aria-label="Increase quantity" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
    </div>
  );
}

export const Empty = ({ title, text, to, cta }) => (
  <div className="empty">
    <h2>{title}</h2>
    {text && <p>{text}</p>}
    {to && <Link className="btn" to={to}>{cta}</Link>}
  </div>
);
