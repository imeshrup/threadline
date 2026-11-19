import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'tl_cart';
const CartContext = createContext(null);

const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
};
const lineKey = (i) => `${i.product}|${i.color}|${i.size}`;

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);

  const value = useMemo(() => {
    const add = (item) => {
      setItems((prev) => {
        const k = lineKey(item);
        const existing = prev.find((i) => lineKey(i) === k);
        if (existing) return prev.map((i) => (lineKey(i) === k ? { ...i, qty: Math.min(i.qty + item.qty, item.maxStock ?? 20) } : i));
        return [...prev, item];
      });
      setDrawerOpen(true);
    };
    const update = (key, qty) => setItems((prev) => prev.map((i) => (lineKey(i) === key ? { ...i, qty: Math.max(1, Math.min(qty, i.maxStock ?? 20)) } : i)));
    const remove = (key) => setItems((prev) => prev.filter((i) => lineKey(i) !== key));
    const clear = () => setItems([]);
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
    return { items, add, update, remove, clear, count, subtotal, lineKey, drawerOpen, setDrawerOpen };
  }, [items, drawerOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
