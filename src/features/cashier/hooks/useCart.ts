import { createContext, useContext } from 'react';
import type { CartItemInput } from '@/shared/api';
import type { ManualDiscount } from '@/shared/types';

export interface CartState {
  items: CartItemInput[];
  orderDiscount?: ManualDiscount;
  promoCode: string;
  customer: { name: string; phone: string };
  heldSaleId?: string; // resumed from hold
}

export const emptyCart: CartState = { items: [], promoCode: '', customer: { name: '', phone: '' } };

export interface CartContextValue {
  cart: CartState;
  setCart: (update: (cart: CartState) => CartState) => void;
  clear: () => void;
  addItem: (variantId: string, max: number) => boolean; // false when the branch has no more in stock
}

export const CartContext = createContext<CartContextValue | null>(null);

// The cashier's current sale. Kept on this device per person and branch, so it survives moving between pages.
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
};
