import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(new Set());

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    api('/users/wishlist').then((list) => setIds(new Set(list.map((p) => p._id)))).catch(() => {});
  }, [user]);

  const toggle = useCallback(async (id) => {
    const has = ids.has(id);
    setIds((prev) => {
      const next = new Set(prev);
      has ? next.delete(id) : next.add(id);
      return next;
    });
    await api(`/users/wishlist/${id}`, { method: has ? 'DELETE' : 'POST' });
    return !has;
  }, [ids]);

  return <WishlistContext.Provider value={{ ids, toggle }}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
