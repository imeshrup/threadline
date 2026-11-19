import { Link, useNavigate } from 'react-router-dom';
import { Price, Stars } from './ui';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';

export default function ProductCard({ product }) {
  const { user } = useAuth();
  const { ids, toggle } = useWishlist();
  const toast = useToast();
  const navigate = useNavigate();
  const saved = ids.has(product._id);
  const onSale = product.compareAtPrice > product.price;
  const soldOut = product.totalStock === 0;

  const onHeart = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login', { state: { from: `/product/${product.slug}` } });
    try {
      const added = await toggle(product._id);
      toast(added ? 'Saved to wishlist' : 'Removed from wishlist');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <Link to={`/product/${product.slug}`} className="card">
      <div className="card-img">
        <img src={product.images[0]} alt={product.name} loading="lazy" />
        {product.images[1] && <img className="alt" src={product.images[1]} alt="" loading="lazy" aria-hidden="true" />}
        {soldOut ? <span className="tag tag-dark">Sold out</span> : onSale && <span className="tag">Sale</span>}
        <button className={`heart ${saved ? 'on' : ''}`} onClick={onHeart} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}>
          {saved ? '♥' : '♡'}
        </button>
      </div>
      <div className="card-body">
        <h3>{product.name}</h3>
        <Price price={product.price} compareAtPrice={product.compareAtPrice} />
        <div className="card-meta">
          <span className="swatches">
            {product.colors.slice(0, 5).map((c) => <span key={c.name} title={c.name} style={{ background: `#${c.hex}` }} />)}
          </span>
          {product.numReviews > 0 && <span className="muted small"><Stars value={product.rating} size={12} /> {product.numReviews}</span>}
        </div>
      </div>
    </Link>
  );
}
