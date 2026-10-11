import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { isCartFlowRoute } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { notify } from '../notify';
import { useCart } from './CartContext';

/**
 * "Added to your cart" — one toast, with a way to the cart, every time the
 * cart's unit count goes up. Watching the count rather than each button covers
 * every way in at once (the shop's quick-add, a pod shop's stepper, the product
 * page, a wishlist move) and stays silent on a failed add or a decrement, which
 * never raise it. The cart and the checkouts already show the cart, so nothing
 * is said there. `notify` replaces the toast on screen, so repeated taps on +
 * never stack. Renders nothing. Native twin: components/cart/CartAddedToast.
 */
export default function CartAddedToast() {
  const { totalCount } = useCart();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const previous = useRef(totalCount);

  useEffect(() => {
    const added = totalCount > previous.current;
    previous.current = totalCount;
    if (!added || isCartFlowRoute(pathname)) return;
    notify(t('mweb.cart.addedToast'), 'success', undefined, {
      label: t('mweb.cart.addedToastAction'),
      onClick: () => navigate('/cart'),
    });
    // Only a change in the count speaks — not a route change or a new `t`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCount]);

  return null;
}
