import { Link } from 'react-router-dom';
import useFetch from '../lib/useFetch';
import ProductCard from '../components/ProductCard';
import { Spinner } from '../components/ui';

const CATS = [
  { label: 'Outerwear', to: '/shop?category=outerwear', img: '/img/garment/jacket/6b6f3a.svg' },
  { label: 'Knitwear & Tops', to: '/shop?category=tops', img: '/img/garment/hoodie/cdb891.svg' },
  { label: 'Dresses', to: '/shop?category=dresses', img: '/img/garment/dress/b5562f.svg' },
  { label: 'Shoes', to: '/shop?category=shoes', img: '/img/garment/sneaker/2f4a3a.svg' },
];

export default function Home() {
  const featured = useFetch('/products?featured=true&limit=8');
  const fresh = useFetch('/products?sort=newest&limit=4');

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">The Winter Edit</span>
            <h1>Made to be worn,<br />season after season.</h1>
            <p>Natural fibers, honest construction and timeless shapes. Discover pieces you'll reach for every day.</p>
            <div className="hero-ctas">
              <Link to="/shop" className="btn btn-lg">Shop the collection</Link>
              <Link to="/shop?sale=true" className="btn btn-ghost btn-lg">Shop sale</Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <img src="/img/garment/jacket/b08654.svg" alt="" />
            <img src="/img/garment/hoodie/9aae93.svg" alt="" />
            <img src="/img/garment/beanie/b5562f.svg" alt="" />
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-head"><h2>Shop by category</h2></div>
        <div className="cat-grid">
          {CATS.map((c) => (
            <Link key={c.label} to={c.to} className="cat-tile">
              <img src={c.img} alt="" loading="lazy" />
              <span>{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <h2>Bestsellers &amp; favorites</h2>
          <Link to="/shop" className="link-btn">View all →</Link>
        </div>
        {featured.loading ? <Spinner /> : (
          <div className="grid">{featured.data?.products.map((p) => <ProductCard key={p._id} product={p} />)}</div>
        )}
      </section>

      <section className="values">
        <div className="container values-grid">
          <div><h3>Natural materials</h3><p>Organic cotton, linen, merino and responsibly sourced leather.</p></div>
          <div><h3>Built to last</h3><p>Reinforced seams and quality hardware on everything we make.</p></div>
          <div><h3>Free returns</h3><p>Not quite right? Return it within 30 days, on us.</p></div>
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <h2>Just landed</h2>
          <Link to="/shop?sort=newest" className="link-btn">Shop new →</Link>
        </div>
        {fresh.loading ? <Spinner /> : (
          <div className="grid">{fresh.data?.products.map((p) => <ProductCard key={p._id} product={p} />)}</div>
        )}
      </section>
    </>
  );
}
