import { useMemo, useState, type ReactNode } from 'react';
import { storageKeys } from '@/shared/constants';
import { useSession, useBranchScope } from '@/shared/hooks';
import { storage } from '@/shared/utils';
import { CartContext, emptyCart, type CartState } from './useCart';

const read = (key: string): CartState => {
  const saved = storage.get(key);
  if (!saved) return emptyCart;
  try {
    return { ...emptyCart, ...(JSON.parse(saved) as CartState) };
  } catch (error) {
    console.error('Unreadable saved cart, starting a new one', error);
    return emptyCart;
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useSession();
  const { branch } = useBranchScope();
  const key = `${storageKeys.cart}.${session?.user.id ?? ''}.${branch?.id ?? ''}`;
  const [carts, setCarts] = useState<Record<string, CartState>>({});
  const cart = carts[key] ?? read(key);

  const value = useMemo(() => {
    const save = (next: CartState) => {
      storage.set(key, JSON.stringify(next));
      setCarts((current) => ({ ...current, [key]: next }));
    };
    return {
      cart,
      setCart: (update: (current: CartState) => CartState) => save(update(cart)),
      clear: () => save(emptyCart),
      addItem: (variantId: string, max: number) => {
        const existing = cart.items.find((item) => item.variantId === variantId);
        if ((existing?.qty ?? 0) + 1 > max) return false;
        save({
          ...cart,
          items: existing ? cart.items.map((item) => (item.variantId === variantId ? { ...item, qty: item.qty + 1 } : item)) : [...cart.items, { variantId, qty: 1 }],
        });
        return true;
      },
    };
  }, [cart, key]);

  return <CartContext value={value}>{children}</CartContext>;
};
