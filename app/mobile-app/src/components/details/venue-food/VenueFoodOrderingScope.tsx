import { createContext, useContext, type ReactNode } from 'react';
import { YStack } from 'tamagui';

import type { PublicVenueDetails } from '@/hooks/useHostsVenues';
import { useFoodOrdering, type FoodOrdering } from '@/hooks/useFoodOrdering';
import { usePublicFinance } from '@/hooks/usePublicFinance';

import { FoodCartBar } from './FoodCartBar';
import { FoodCartSheet } from './FoodCartSheet';

interface Props {
  venue: PublicVenueDetails;
  /** Re-read the venue — a dish left the menu between the screen loading and the order. */
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
}

const OrderingContext = createContext<FoodOrdering | null>(null);

/** The venue's food ordering — the cart, its sheet and the pay handler — for the menu section. */
export function useVenueFoodOrdering(): FoodOrdering {
  const ordering = useContext(OrderingContext);
  if (!ordering) throw new Error('useVenueFoodOrdering must be used inside VenueFoodOrderingScope');
  return ordering;
}

/**
 * The menu sits inside the venue's scroll and the cart button floats over its
 * bottom-right corner, so the ordering state they share lives one level above
 * both: the scroll is `children`, and the button and the cart sheet are drawn
 * here, over it.
 */
function OrderingScope({ venue, onRefresh, children }: Readonly<Props>) {
  const ordering = useFoodOrdering(venue, onRefresh);
  const { currency } = usePublicFinance();
  const { cart, canOrder } = ordering;
  return (
    <OrderingContext.Provider value={ordering}>
      <YStack flex={1}>
        <YStack flex={1}>{children}</YStack>
        {canOrder ? (
          <FoodCartBar price={cart.price} currency={currency} onOpen={ordering.openSheet} />
        ) : null}
        <FoodCartSheet
          ordering={ordering}
          currency={currency}
          discountPct={venue.food_ordering.discount_pct}
        />
      </YStack>
    </OrderingContext.Provider>
  );
}

/** A venue with no food has no cart, and nothing of the ordering is mounted for it. */
export function VenueFoodOrderingScope(props: Readonly<Props>) {
  if (!props.venue.offers_food) return <>{props.children}</>;
  return <OrderingScope {...props} />;
}
