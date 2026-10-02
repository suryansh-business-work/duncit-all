import type { ReactNode } from 'react';
import { CartProvider } from './CartContext';
import { WishlistProvider } from './WishlistContext';
import CartReminderHost from './cart-reminder';

/**
 * Everything the Pod Shop cart needs at the app root: the cart, the wishlist
 * that borrows from it, and — for a signed-in member — the reminder host (the
 * server mirror plus the "your cart is calling" nudge, which is fixed to the
 * viewport, so where it renders in the tree does not matter).
 */
export default function CartProviders({
  signedIn,
  children,
}: Readonly<{ signedIn: boolean; children: ReactNode }>) {
  return (
    <CartProvider>
      <WishlistProvider>
        {children}
        {signedIn && <CartReminderHost />}
      </WishlistProvider>
    </CartProvider>
  );
}
