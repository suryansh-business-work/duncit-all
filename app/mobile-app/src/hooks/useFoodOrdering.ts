import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FoodCheckoutValues } from '@duncit/forms/schemas';
import { logs } from '@duncit/logs';
import {
  FOOD_ORDER_ERROR,
  buildFoodOrderInput,
  foodAttemptSignature,
  type VenueFoodOrderPlacement,
} from '@duncit/utils';

import { useFoodCart } from '@/hooks/useFoodCart';
import { useFoodCheckout, useFoodClientKey } from '@/hooks/useFoodCheckout';
import { useFoodCouponConfirm } from '@/hooks/useFoodCoupon';
import { useFoodGuest } from '@/hooks/useFoodGuest';
import type { PublicVenueDetails } from '@/hooks/useHostsVenues';
import type { RootStackParamList } from '@/navigation/types';
import { recentFoodOrder, writeFoodGuest, type StoredFoodOrder } from '@/services/food-storage';
import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * Everything the menu needs to take an order: the venue's cart, the cart
 * sheet's open state, and the pay handler. It also reacts to the two answers
 * that change the screen rather than just the message — the venue stopped
 * taking orders (the cart goes, the menu stays), or a dish left the menu (the
 * venue is re-read, and the cart drops it). RN twin of mWeb's
 * food/useFoodOrdering.
 */
export function useFoodOrdering(venue: PublicVenueDetails, onRefresh: () => Promise<unknown>) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const cart = useFoodCart(venue.id, venue.food_menu, venue.food_ordering.discount_pct);
  const clientKey = useFoodClientKey();
  const knownGuest = useFoodGuest();
  // What was typed for the attempt in flight, so a declined payment reopens the sheet as it was left.
  const [typed, setTyped] = useState<FoodCheckoutValues | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [closed, setClosed] = useState(false);
  // The member's order here that is still in progress — the menu's "Track your order" link.
  const [tracked, setTracked] = useState<StoredFoodOrder | null>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      fireAndForget(
        recentFoodOrder(venue.id).then((order) => {
          if (active) setTracked(order);
        }),
      );
    load();
    // Coming back from the order screen: the order may have finished meanwhile.
    const unsubscribe = navigation.addListener('focus', load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [venue.id, navigation]);

  const openOrder = (orderId: string, key: string) =>
    navigation.navigate('VenueFoodOrder', { venueId: venue.id, orderId, key });

  const onDone = (placement: VenueFoodOrderPlacement) => {
    cart.clear();
    clientKey.reset();
    setSheetOpen(false);
    openOrder(placement.order.id, placement.access_key);
  };

  const onRefused = (code: string) => {
    if (code === FOOD_ORDER_ERROR.closed) {
      setClosed(true);
      setSheetOpen(false);
      return;
    }
    if (code === FOOD_ORDER_ERROR.itemUnavailable) {
      onRefresh().catch((error: unknown) =>
        logs.mobileApp.warn('venueFood', 'refreshMenu', { error, venueId: venue.id }),
      );
    }
  };

  const checkout = useFoodCheckout({ onDone, onRefused });

  const coupon = useFoodCouponConfirm({ venueId: venue.id, cart, onStopped: checkout.fail });
  // A ref, not the state: a second tap while the coupon is being checked must not place a second time.
  const paying = useRef(false);

  const place = async (values: FoodCheckoutValues) => {
    checkout.clearError();
    // The server is asked about the code once more — now with the mobile typed — before anything is placed.
    if (!(await coupon.confirm(values.phone))) return;
    // The code goes with the order only while the total on the Pay button counts it: under
    // its minimum the cart is shown — and so ordered — without it.
    const code = cart.price.couponUnmet ? null : (cart.coupon?.code ?? null);
    // One object for the order and for its key: applying or removing a code is a new attempt.
    const details = { ...values, coupon: code };
    await checkout.start(
      buildFoodOrderInput({
        venueId: venue.id,
        lines: cart.lines,
        details,
        // Same cart and details → same key → the same order, however often Pay is pressed.
        clientKey: clientKey.keyFor(foodAttemptSignature(cart.signature, details)),
      }),
    );
  };

  const pay = async (values: FoodCheckoutValues) => {
    if (paying.current) return;
    paying.current = true;
    setTyped(values);
    fireAndForget(writeFoodGuest({ name: values.name, phone: values.phone }));
    try {
      await place(values);
    } finally {
      paying.current = false;
    }
  };

  const canOrder = venue.food_ordering.enabled && !closed;

  // Emptying the cart from inside the sheet closes it for good, not until the next Add.
  const empty = cart.lines.length === 0;
  useEffect(() => {
    if (empty) setSheetOpen(false);
  }, [empty]);

  return {
    venueId: venue.id,
    cart,
    canOrder,
    closed,
    checkout,
    // The coupon's check at Pay locks the sheet exactly as the payment does.
    submitting: checkout.submitting || coupon.confirming,
    pay,
    tracked,
    openTracked: () => {
      if (tracked) openOrder(tracked.order_id, tracked.access_key);
    },
    guest: typed ?? knownGuest,
    // Stays up under Razorpay's sheet, which the cart sheet itself presents: iOS
    // will not open one modal while another is still closing.
    sheetOpen: sheetOpen && canOrder && !empty,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
  };
}

export type FoodOrdering = ReturnType<typeof useFoodOrdering>;
