import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useFetch from '../lib/useFetch';
import { api } from '../lib/api';
import { CATEGORY_LABELS, date, FREE_SHIPPING, money } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import ProductCard from '../components/ProductCard';
import { Alert, Empty, Price, QtyStepper, Spinner, Stars } from '../components/ui';

export default function Product() {
  const { slug } = useParams();
  const { data, loading, error, setData } = useFetch(`/products/${slug}`);
  const { add } = useCart();
  const { user } = useAuth();
  const { ids, toggle } = useWishlist();
  const toast = useToast();
  const navigate = useNavigate();

  const [colorIdx, setColorIdx] = useState(0);
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);

  useEffect(() => { setColorIdx(0); setSize(''); setQty(1); window.scrollTo(0, 0); }, [slug]);

  if (loading) return <Spinner />;
  if (error) return <div className="container"><Empty title="Product not found" text={error} to="/shop" cta="Back to shop" /></div>;

  const { product, related } = data;
  const color = product.colors[colorIdx];
  const stockFor = (s) => product.variants.find((v) => v.size === s && v.color === color?.name)?.stock ?? 0;
  const stock = size ? stockFor(size) : null;
  const image = product.images[colorIdx] || product.images[0];
  const saved = ids.has(product._id);

  const addToCart = () => {
    if (!size) return setSizeError(true);
    add({
      product: product._id, slug: product.slug, name: product.name, image, price: product.price,
      color: color.name, size, qty: Math.min(qty, stock), maxStock: stock,
    });
  };

  const onWishlist = async () => {
    if (!user) return navigate('/login', { state: { from: `/product/${slug}` } });
    const added = await toggle(product._id);
    toast(added ? 'Saved to wishlist' : 'Removed from wishlist');
  };

  return (
    <div className="container">
      <nav className="breadcrumbs">
        <Link to="/">Home</Link> / <Link to={`/shop?category=${product.category}`}>{CATEGORY_LABELS[product.category]}</Link> / <span>{product.name}</span>
      </nav>

      <div className="pdp">
        <div className="gallery">
          <div className="gallery-main"><img src={image} alt={`${product.name} in ${color?.name}`} /></div>
          {product.images.length > 1 && (
            <div className="thumbs">
              {product.images.map((src, i) => (
                <button key={src} className={i === colorIdx ? 'on' : ''} onClick={() => { setColorIdx(i); setSize(''); }} aria-label={product.colors[i]?.name}>
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pdp-info">
          <span className="eyebrow">{product.brand}</span>
          <h1>{product.name}</h1>
          <div className="pdp-price"><Price price={product.price} compareAtPrice={product.compareAtPrice} /></div>
          {product.numReviews > 0 && (
            <a href="#reviews" className="pdp-rating"><Stars value={product.rating} /> {product.rating} · {product.numReviews} review{product.numReviews > 1 && 's'}</a>
          )}

          <div className="option">
            <div className="option-label">Color: <b>{color?.name}</b></div>
            <div className="color-chips">
              {product.colors.map((c, i) => (
                <button key={c.name} className={`swatch lg ${i === colorIdx ? 'on' : ''}`} style={{ background: `#${c.hex}` }}
                  title={c.name} aria-label={c.name} aria-pressed={i === colorIdx} onClick={() => { setColorIdx(i); setSize(''); }} />
              ))}
            </div>
          </div>

          <div className="option">
            <div className="option-label">Size{size && <>: <b>{size}</b></>}</div>
            <div className="chips">
              {product.sizes.map((s) => {
                const out = stockFor(s) === 0;
                return (
                  <button key={s} className={`chip lg ${size === s ? 'on' : ''} ${out ? 'out' : ''}`} disabled={out}
                    onClick={() => { setSize(s); setSizeError(false); setQty(1); }}>{s}</button>
                );
              })}
            </div>
            {sizeError && <p className="field-error">Please select a size</p>}
            {stock !== null && stock > 0 && stock <= 5 && <p className="low-stock">Only {stock} left in this size</p>}
          </div>

          <div className="buy-row">
            <QtyStepper value={qty} onChange={setQty} max={stock || 20} />
            <button className="btn btn-lg grow" onClick={addToCart} disabled={product.totalStock === 0}>
              {product.totalStock === 0 ? 'Sold out' : 'Add to bag'}
            </button>
            <button className={`btn btn-ghost btn-lg heart-btn ${saved ? 'on' : ''}`} onClick={onWishlist} aria-label="Toggle wishlist">{saved ? '♥' : '♡'}</button>
          </div>

          <ul className="perks">
            <li>Free standard shipping on orders over {money(FREE_SHIPPING)}</li>
            <li>Free returns within 30 days</li>
          </ul>

          <details open><summary>Description</summary><p>{product.description}</p></details>
          <details><summary>Shipping &amp; returns</summary><p>Standard delivery in 3–5 business days, express in 1–2. Returns are free within 30 days of delivery in original condition.</p></details>
          <details><summary>Care</summary><p>Machine wash cold with like colors. Lay flat to dry. Do not bleach.</p></details>
        </div>
      </div>

      <Reviews product={product} onUpdate={(p) => setData({ ...data, product: p })} />

      {related.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>You may also like</h2></div>
          <div className="grid">{related.map((p) => <ProductCard key={p._id} product={p} />)}</div>
        </section>
      )}
    </div>
  );
}

function Reviews({ product, onUpdate }) {
  const { user } = useAuth();
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const mine = user && product.reviews.find((r) => r.user === user._id);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const p = await api(`/products/${product._id}/reviews`, { method: 'POST', body: { rating, comment } });
      onUpdate(p);
      setComment('');
      toast('Thanks for your review!');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      onUpdate(await api(`/products/${product._id}/reviews/${id}`, { method: 'DELETE' }));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const dist = [5, 4, 3, 2, 1].map((n) => product.reviews.filter((r) => r.rating === n).length);

  return (
    <section className="reviews section" id="reviews">
      <div className="section-head"><h2>Reviews</h2></div>
      <div className="reviews-grid">
        <div className="reviews-summary">
          <div className="big-rating">{product.numReviews ? product.rating.toFixed(1) : '—'}</div>
          <Stars value={product.rating} size={18} />
          <p className="muted small">{product.numReviews} review{product.numReviews !== 1 && 's'}</p>
          <div className="dist">
            {dist.map((n, i) => (
              <div key={i} className="dist-row">
                <span>{5 - i}★</span>
                <div className="bar"><span style={{ width: product.numReviews ? `${(n / product.numReviews) * 100}%` : 0 }} /></div>
                <span className="muted">{n}</span>
              </div>
            ))}
          </div>
          {!user && <p className="small"><Link to="/login" state={{ from: `/product/${product.slug}` }}>Sign in</Link> to write a review.</p>}
          {user && !mine && (
            <form className="review-form" onSubmit={submit}>
              <h3>Write a review</h3>
              <div className="star-input" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)} aria-label={`${n} stars`} aria-checked={rating === n} role="radio">★</button>
                ))}
              </div>
              <textarea required rows={4} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was the fit, fabric and quality?" />
              <Alert>{error}</Alert>
              <button className="btn" disabled={busy}>{busy ? 'Posting…' : 'Post review'}</button>
            </form>
          )}
        </div>
        <ul className="review-list">
          {product.reviews.length === 0 && <li className="muted">No reviews yet. Be the first!</li>}
          {[...product.reviews].reverse().map((r) => (
            <li key={r._id}>
              <div className="row-between">
                <Stars value={r.rating} />
                <span className="muted small">{date(r.createdAt)}</span>
              </div>
              <p>{r.comment}</p>
              <div className="muted small">
                {r.name}{r.verified && <span className="verified"> · ✓ Verified buyer</span>}
                {user && (user._id === r.user || user.isAdmin) && <button className="link-btn small" onClick={() => remove(r._id)}> · Delete</button>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
