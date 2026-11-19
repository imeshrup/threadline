import { useState } from 'react';
import { Link } from 'react-router-dom';
import useFetch from '../../lib/useFetch';
import { api, qs } from '../../lib/api';
import { CATEGORY_LABELS, money } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { Alert, Pagination, Spinner } from '../../components/ui';

export default function Products() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/products${qs({ q: search, page, limit: 20 })}`);

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api(`/products/${p._id}`, { method: 'DELETE' });
      toast('Product deleted');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="row-between wrap">
        <h1>Products</h1>
        <Link to="/admin/products/new" className="btn">+ New product</Link>
      </div>
      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); setSearch(q); setPage(1); }}>
        <input placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-ghost">Search</button>
      </form>
      <Alert>{error}</Alert>
      {loading ? <Spinner /> : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th /><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Rating</th><th /></tr></thead>
              <tbody>
                {data.products.map((p) => (
                  <tr key={p._id}>
                    <td><img className="table-thumb" src={p.images[0]} alt="" /></td>
                    <td><Link to={`/product/${p.slug}`}>{p.name}</Link>{p.featured && <span className="badge badge-paid">featured</span>}</td>
                    <td>{CATEGORY_LABELS[p.category]}</td>
                    <td>{money(p.price)}</td>
                    <td className={p.totalStock === 0 ? 'text-danger' : p.totalStock < 15 ? 'text-warn' : ''}>{p.totalStock}</td>
                    <td>{p.numReviews ? `${p.rating} (${p.numReviews})` : '—'}</td>
                    <td className="actions">
                      <Link to={`/admin/products/${p._id}`} className="btn btn-sm btn-ghost">Edit</Link>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}
    </>
  );
}
