import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { logs } from '@duncit/logs';
import {
  FOOD_ORDER_ERROR,
  buildFoodOrderInput,
  foodAttemptSignature,
  foodCouponRejectionOf,
  type VenueFoodOrderPlacement,
} from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import type { PublicVenue } from '../queries';
import type { FoodCheckoutValues } from './food-checkout';
import { foodOrderPath, writeFoodGuest } from './foodStorage';
import { useFoodCart } from './useFoodCart';
import { foodCouponRefusal, useFoodCheckout, useFoodClientKey } from './useFoodCheckout';
import { foodCouponNoticeText, useFoodCoupon } from './useFoodCoupon';
import { useFoodGuest } from './useFoodGuest';

/**
 * Everything the menu needs to take an order: the venue's cart and its coupon,
 * the cart sheet's open state, and the pay handler. It also reacts to the two answers
 * that change the page rather than just the message — the venue stopped taking
 * orders (the cart goes, the menu stays), or a dish left the menu (the venue
 * is re-read, and the cart drops it).
 */
export function useFoodOrdering(venue: PublicVenue, onRefresh: () => Promise<unknown>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const cart = useFoodCart(venue.id, venue.food_menu, venue.food_ordering.discount_pct, venue.food_ordering);
  const clientKey = useFoodClientKey();
  const knownGuest = useFoodGuest();
  // What was typed for the attempt in flight, so a declined payment reopens the sheet as it was left.
  const [typed, setTyped] = useState<FoodCheckoutValues | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [closed, setClosed] = useState(false);
  const guest = typed ?? knownGuest;
  const coupon = useFoodCoupon(venue.id, cart, guest.phone);

  const onDone = (placement: VenueFoodOrderPlacement) => {
    cart.clear();
    clientKey.reset();
    setSheetOpen(false);
    Promise.resolve(navigate(foodOrderPath(venue.id, placement.order.id, placement.access_key))).catch(
      (error: unknown) => logs.mWeb.error('venueFood', 'openOrder', { error, orderId: placement.order.id }),
    );
  };

  const onRefused = (code: string, error: unknown) => {
    // Nothing was placed and the cart stays: the guest removes the code, or tries another.
    if (code === FOOD_ORDER_ERROR.couponRejected) coupon.reject(foodCouponRejectionOf(error) ?? 'INVALID');
    if (code === FOOD_ORDER_ERROR.closed) {
      setClosed(true);
      setSheetOpen(false);
      return;
    }
    if (code === FOOD_ORDER_ERROR.itemUnavailable) {
      onRefresh().catch((error: unknown) => logs.mWeb.warn('venueFood', 'refreshMenu', { error, venueId: venue.id }));
    }
  };

  const checkout = useFoodCheckout({ onDone, onRefused });

  const pay = async (values: FoodCheckoutValues) => {
    setTyped(values);
    writeFoodGuest({ name: values.name, phone: values.phone });
    // The code was accepted for an earlier cart, perhaps on an earlier visit: the
    // server is asked once more — now with the mobile typed — before anything is placed.
    const { proceed, notice } = await coupon.confirm(values.phone);
    if (!proceed) {
      if (notice?.kind === 'rejected') checkout.fail(foodCouponRefusal(notice.reason, t));
      else if (notice) checkout.fail({ title: null, message: foodCouponNoticeText(notice, t) });
      return;
    }
    // A code the cart no longer earns is left off, so the order is placed at the total shown.
    const details = { ...values, coupon: cart.price.couponUnmet ? null : (cart.coupon?.coupon_code ?? null) };
    await checkout.start(
      buildFoodOrderInput({
        venueId: venue.id,
        lines: cart.lines,
        details,
        // Same cart, details and coupon → same key → the same order, however often Pay is pressed.
        clientKey: clientKey.keyFor(foodAttemptSignature(cart.signature, details)),
      }),
    );
  };

  const removeCoupon = () => {
    coupon.remove();
    // Whatever was refused was refused with the code on.
    checkout.clearError();
  };

  const canOrder = venue.food_ordering.enabled && !closed;

  // Emptying the cart from inside the sheet closes it for good, not until the next Add.
  const empty = cart.lines.length === 0;
  useEffect(() => {
    if (empty) setSheetOpen(false);
  }, [empty]);

  return {
    cart,
    canOrder,
    closed,
    checkout,
    coupon: { ...coupon, remove: removeCoupon },
    // The coupon's check at Pay locks the sheet exactly as the payment does.
    submitting: checkout.submitting || coupon.confirming,
    pay,
    guest,
    // Hidden while Razorpay's own sheet is up — see `gatewayOpen`.
    sheetOpen: sheetOpen && canOrder && !empty && !checkout.gatewayOpen,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
  };
}
