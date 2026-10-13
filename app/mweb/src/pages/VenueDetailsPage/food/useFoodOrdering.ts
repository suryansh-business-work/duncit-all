import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { logs } from '@duncit/logs';
import { FOOD_ORDER_ERROR, type VenueFoodOrderPlacement } from '@duncit/utils';
import type { PublicVenue } from '../queries';
import type { FoodCheckoutValues } from './food-checkout';
import { foodOrderPath, writeFoodGuest } from './foodStorage';
import { useFoodCart } from './useFoodCart';
import { useFoodCheckout, useFoodClientKey } from './useFoodCheckout';
import { useFoodGuest } from './useFoodGuest';

/**
 * Everything the menu needs to take an order: the venue's cart, the cart
 * sheet's open state, and the pay handler. It also reacts to the two answers
 * that change the page rather than just the message — the venue stopped taking
 * orders (the cart goes, the menu stays), or a dish left the menu (the venue
 * is re-read, and the cart drops it).
 */
export function useFoodOrdering(venue: PublicVenue, onRefresh: () => Promise<unknown>) {
  const navigate = useNavigate();
  const cart = useFoodCart(venue.id, venue.food_menu, venue.food_ordering.discount_pct);
  const clientKey = useFoodClientKey();
  const knownGuest = useFoodGuest();
  // What was typed for the attempt in flight, so a declined payment reopens the sheet as it was left.
  const [typed, setTyped] = useState<FoodCheckoutValues | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [closed, setClosed] = useState(false);

  const onDone = (placement: VenueFoodOrderPlacement) => {
    cart.clear();
    clientKey.reset();
    setSheetOpen(false);
    Promise.resolve(navigate(foodOrderPath(venue.id, placement.order.id, placement.access_key))).catch(
      (error: unknown) => logs.mWeb.error('venueFood', 'openOrder', { error, orderId: placement.order.id }),
    );
  };

  const onRefused = (code: string) => {
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

  const pay = (values: FoodCheckoutValues) => {
    setTyped(values);
    writeFoodGuest({ name: values.name, phone: values.phone });
    return checkout.start({
      venue_id: venue.id,
      items: cart.lines.map((line) => ({ item_id: line.item.id, quantity: line.quantity })),
      customer_name: values.name,
      customer_phone: values.phone,
      table_label: values.table || null,
      note: values.note || null,
      // Same cart and details → same key → the same order, however often Pay is pressed.
      client_key: clientKey.keyFor(`${cart.signature}#${JSON.stringify(values)}`),
    });
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
    pay,
    guest: typed ?? knownGuest,
    // Hidden while Razorpay's own sheet is up — see `gatewayOpen`.
    sheetOpen: sheetOpen && canOrder && !empty && !checkout.gatewayOpen,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
  };
}
