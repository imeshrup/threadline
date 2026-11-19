import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useFetch from '../lib/useFetch';
import { qs } from '../lib/api';
import { CATEGORY_LABELS } from '../lib/format';
import ProductCard from '../components/ProductCard';
import { Alert, Empty, Pagination, Spinner } from '../components/ui';

const LIST_KEYS = ['category', 'gender', 'size', 'color'];
const SORTS = [
  ['newest', 'Newest'],
  ['popular', 'Most popular'],
  ['rating', 'Top rated'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const facets = useFetch('/products/filters');

  const state = useMemo(() => {
    const s = Object.fromEntries(params.entries());
    LIST_KEYS.forEach((k) => { s[k] = s[k] ? s[k].split(',') : []; });
    return s;
  }, [params]);

  const query = qs({ ...state, limit: 12 });
  const { data, loading, error } = useFetch(`/products${query}`);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) next.delete(key);
    else next.set(key, Array.isArray(value) ? value.join(',') : value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };
  const toggle = (key, value) => {
    const cur = state[key];
    setParam(key, cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]);
  };
  const clearAll = () => setParams(state.q ? { q: state.q } : {});
  const activeCount = LIST_KEYS.reduce((n, k) => n + state[k].length, 0) + (state.minPrice ? 1 : 0) + (state.maxPrice ? 1 : 0) + (state.sale ? 1 : 0);

  const title = state.q
    ? `Results for “${state.q}”`
    : state.sale ? 'Sale'
    : state.category.length === 1 ? CATEGORY_LABELS[state.category[0]]
    : state.gender.length === 1 ? `${state.gender[0][0].toUpperCase()}${state.gender[0].slice(1)}`
    : 'All products';

  const f = facets.data;
  return (
    <div className="container shop">
      <div className="shop-head">
        <div>
          <h1>{title}</h1>
          {data && <p className="muted">{data.total} {data.total === 1 ? 'item' : 'items'}</p>}
        </div>
        <div className="shop-tools">
          <button className="btn btn-ghost filter-toggle" onClick={() => setFiltersOpen((o) => !o)}>
            Filters{activeCount ? ` (${activeCount})` : ''}
          </button>
          <label className="sort">
            <span className="muted small">Sort</span>
            <select value={state.sort || 'newest'} onChange={(e) => setParam('sort', e.target.value)}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="shop-body">
        <aside className={`filters ${filtersOpen ? 'open' : ''}`}>
          {activeCount > 0 && <button className="link-btn" onClick={clearAll}>Clear all filters</button>}
          {f && (
            <>
              <fieldset>
                <legend>Category</legend>
                {f.categories.map((c) => (
                  <label key={c} className="check">
                    <input type="checkbox" checked={state.category.includes(c)} onChange={() => toggle('category', c)} />
                    {CATEGORY_LABELS[c] || c}
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>Gender</legend>
                {['women', 'men'].map((g) => (
                  <label key={g} className="check">
                    <input type="checkbox" checked={state.gender.includes(g)} onChange={() => toggle('gender', g)} />
                    {g[0].toUpperCase() + g.slice(1)}
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>Size</legend>
                <div className="chips">
                  {f.sizes.map((s) => (
                    <button key={s} type="button" className={`chip ${state.size.includes(s) ? 'on' : ''}`} onClick={() => toggle('size', s)}>{s}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Color</legend>
                <div className="color-chips">
                  {f.colors.map((c) => (
                    <button key={c.name} type="button" title={c.name} aria-label={c.name} aria-pressed={state.color.includes(c.name)}
                      className={`swatch ${state.color.includes(c.name) ? 'on' : ''}`} style={{ background: `#${c.hex}` }} onClick={() => toggle('color', c.name)} />
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Price</legend>
                <PriceRange min={state.minPrice} max={state.maxPrice} onApply={(lo, hi) => {
                  const next = new URLSearchParams(params);
                  lo ? next.set('minPrice', lo) : next.delete('minPrice');
                  hi ? next.set('maxPrice', hi) : next.delete('maxPrice');
                  next.delete('page');
                  setParams(next);
                }} />
              </fieldset>
              <label className="check">
                <input type="checkbox" checked={state.sale === 'true'} onChange={(e) => setParam('sale', e.target.checked ? 'true' : '')} />
                On sale only
              </label>
            </>
          )}
        </aside>

        <section className="shop-results">
          <Alert>{error}</Alert>
          {loading ? <Spinner /> : data?.products.length ? (
            <>
              <div className="grid grid-3">{data.products.map((p) => <ProductCard key={p._id} product={p} />)}</div>
              <Pagination page={data.page} pages={data.pages} onChange={(p) => { setParam('page', String(p)); window.scrollTo(0, 0); }} />
            </>
          ) : (
            !error && <Empty title="No matches" text="Try removing some filters or searching for something else." />
          )}
        </section>
      </div>
    </div>
  );
}

function PriceRange({ min = '', max = '', onApply }) {
  const [lo, setLo] = useState(min);
  const [hi, setHi] = useState(max);
  return (
    <form className="price-range" onSubmit={(e) => { e.preventDefault(); onApply(lo, hi); }}>
      <input type="number" min="0" placeholder="Min" value={lo} onChange={(e) => setLo(e.target.value)} aria-label="Minimum price" />
      <span>–</span>
      <input type="number" min="0" placeholder="Max" value={hi} onChange={(e) => setHi(e.target.value)} aria-label="Maximum price" />
      <button className="btn btn-sm">Go</button>
    </form>
  );
}
