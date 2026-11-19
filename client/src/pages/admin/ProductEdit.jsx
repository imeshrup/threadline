import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { CATEGORY_LABELS } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { Alert, Spinner } from '../../components/ui';

const EMPTY = {
  name: '', description: '', brand: 'Threadline', category: 'tops', gender: 'unisex', price: '', compareAtPrice: '',
  images: [], colors: [{ name: 'Black', hex: '1f2328' }], sizes: ['S', 'M', 'L'], variants: [], tags: [], featured: false,
};

export default function ProductEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const [p, setP] = useState(isNew ? EMPTY : null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sizesText, setSizesText] = useState(EMPTY.sizes.join(', '));
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (isNew) return;
    api(`/products/${id}`).then(({ product }) => {
      setP({ ...product, compareAtPrice: product.compareAtPrice ?? '' });
      setSizesText(product.sizes.join(', '));
    }).catch((e) => setError(e.message));
  }, [id, isNew]);

  if (!p) return error ? <Alert>{error}</Alert> : <Spinner />;
  const set = (k, v) => setP((prev) => ({ ...prev, [k]: v }));
  const stock = (size, color) => p.variants.find((v) => v.size === size && v.color === color)?.stock ?? 0;
  const setStock = (size, color, n) => {
    const rest = p.variants.filter((v) => !(v.size === size && v.color === color));
    set('variants', [...rest, { size, color, stock: Math.max(0, parseInt(n, 10) || 0) }]);
  };
  const sizes = sizesText.split(',').map((s) => s.trim()).filter(Boolean);

  const upload = async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    try {
      const { url } = await api('/upload', { method: 'POST', body: fd });
      set('images', [...p.images, url]);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const colors = p.colors.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), hex: c.hex.replace('#', '') }));
    const body = {
      ...p,
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice === '' ? null : Number(p.compareAtPrice),
      sizes,
      colors,
      variants: sizes.flatMap((s) => colors.map((c) => ({ size: s, color: c.name, stock: stock(s, c.name) }))),
    };
    if (!body.images.length && colors[0]) body.images = colors.map((c) => `/img/garment/tee/${c.hex}.svg`);
    try {
      await api(isNew ? '/products' : `/products/${id}`, { method: isNew ? 'POST' : 'PUT', body });
      toast(isNew ? 'Product created' : 'Product saved');
      navigate('/admin/products');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save}>
      <div className="row-between wrap">
        <h1>{isNew ? 'New product' : `Edit: ${p.name}`}</h1>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin/products')}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
        </div>
      </div>
      <Alert>{error}</Alert>

      <div className="edit-grid">
        <section className="panel">
          <h2>Basics</h2>
          <label className="field"><span>Name</span><input required value={p.name} onChange={(e) => set('name', e.target.value)} /></label>
          <label className="field"><span>Description</span><textarea required rows={5} value={p.description} onChange={(e) => set('description', e.target.value)} /></label>
          <div className="form-grid">
            <label className="field"><span>Category</span>
              <select value={p.category} onChange={(e) => set('category', e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="field"><span>Gender</span>
              <select value={p.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="unisex">Unisex</option><option value="women">Women</option><option value="men">Men</option>
              </select>
            </label>
            <label className="field"><span>Price ($)</span><input type="number" step="0.01" min="0" required value={p.price} onChange={(e) => set('price', e.target.value)} /></label>
            <label className="field"><span>Compare-at price ($)</span><input type="number" step="0.01" min="0" value={p.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value)} placeholder="For sale items" /></label>
            <label className="field"><span>Brand</span><input value={p.brand} onChange={(e) => set('brand', e.target.value)} /></label>
            <label className="field"><span>Tags (comma separated)</span><input value={p.tags.join(', ')} onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))} /></label>
          </div>
          <label className="check"><input type="checkbox" checked={p.featured} onChange={(e) => set('featured', e.target.checked)} /> Feature on homepage</label>
        </section>

        <section className="panel">
          <h2>Images</h2>
          <p className="muted small">The image at the same position as a color is shown when that color is selected.</p>
          <div className="img-edit">
            {p.images.map((src, i) => (
              <div key={src + i} className="img-item">
                <img src={src} alt="" />
                <button type="button" className="icon-btn" aria-label="Remove image" onClick={() => set('images', p.images.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
          <label className="btn btn-ghost btn-sm file-btn">Upload image<input type="file" accept="image/*" onChange={(e) => e.target.files[0] && upload(e.target.files[0])} /></label>
          <div className="toolbar">
            <input placeholder="…or paste an image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (imageUrl) { set('images', [...p.images, imageUrl]); setImageUrl(''); } }}>Add</button>
          </div>
        </section>

        <section className="panel span-2">
          <h2>Variants &amp; inventory</h2>
          <div className="form-grid">
            <label className="field span-2"><span>Sizes (comma separated)</span><input value={sizesText} onChange={(e) => setSizesText(e.target.value)} /></label>
          </div>
          <div className="colors-edit">
            {p.colors.map((c, i) => (
              <div key={i} className="color-row">
                <input type="color" value={`#${c.hex.replace('#', '')}`} onChange={(e) => set('colors', p.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value.slice(1) } : x)))} aria-label="Color swatch" />
                <input value={c.name} placeholder="Color name" onChange={(e) => {
                  const old = c.name; const name = e.target.value;
                  setP((prev) => ({ ...prev, colors: prev.colors.map((x, j) => (j === i ? { ...x, name } : x)), variants: prev.variants.map((v) => (v.color === old ? { ...v, color: name } : v)) }));
                }} />
                <button type="button" className="link-btn small" onClick={() => set('colors', p.colors.filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('colors', [...p.colors, { name: '', hex: '888888' }])}>+ Add color</button>
          </div>
          <div className="table-wrap">
            <table className="table stock-table">
              <thead><tr><th>Color \ Size</th>{sizes.map((s) => <th key={s}>{s}</th>)}</tr></thead>
              <tbody>
                {p.colors.filter((c) => c.name).map((c) => (
                  <tr key={c.name}>
                    <td><span className="swatch sm" style={{ background: `#${c.hex}` }} /> {c.name}</td>
                    {sizes.map((s) => (
                      <td key={s}><input type="number" min="0" value={stock(s, c.name)} onChange={(e) => setStock(s, c.name, e.target.value)} aria-label={`${c.name} ${s} stock`} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </form>
  );
}
