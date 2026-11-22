/**
 * The Duncit Venue Kit, as every surface describes it.
 *
 * The plan itself (price, quantities, percentages) is data from the server's
 * `venueKitOffer`; these are the rules both duncit.com/venue-kit and the
 * Venues console apply to it, so the two cannot drift (rule 40: share the
 * logic, keep each surface's UI its own). Framework-free on purpose.
 */
import { formatINR } from './format-money';

/** The plan as `venueKitOffer` returns it. Money in paise. */
export interface VenueKitOffer {
  annual_price_paise: number;
  included_table_labels: number;
  extra_label_price_paise: number;
  pos_activation_months: number;
  gift_card_count: number;
  gift_card_value_paise: number;
  collab_gift_card_discount_pct: number;
  order_benefit_pct: number;
}

/**
 * What a page renders when the API cannot be reached (a static build with the
 * server down). The SAME numbers the server seeds in `VENUE_KIT_OFFER_DEFAULTS`
 * (server/src imports no @duncit/* package); an admin's saved plan always wins.
 */
export const VENUE_KIT_FALLBACK_OFFER: Readonly<VenueKitOffer> = {
  annual_price_paise: 999_900,
  included_table_labels: 25,
  extra_label_price_paise: 10_000,
  pos_activation_months: 12,
  gift_card_count: 10,
  gift_card_value_paise: 10_000,
  collab_gift_card_discount_pct: 10,
  order_benefit_pct: 1,
};


/** The kit's seven features, in the order every surface lists them. Each key names its copy. */
export const VENUE_KIT_FEATURES = [
  'tableLabels',
  'counterStandee',
  'smartPos',
  'freeGiftCards',
  'collabGiftCards',
  'razorpay',
  'orderBenefit',
] as const;
export type VenueKitFeature = (typeof VENUE_KIT_FEATURES)[number];

/** Whole rupees from paise, e.g. 999900 → "₹9,999". */
export const venueKitRupees = (paise: number): string => formatINR(Math.round(paise) / 100);

/** A percentage without a needless ".0", e.g. 1 → "1%", 1.5 → "1.5%". */
export const venueKitPercent = (pct: number): string => `${Number(pct.toFixed(2))}%`;

/**
 * Accepts a possibly partial or malformed answer and fills every gap from the
 * fallback, so a renamed or missing field can never print "₹NaN".
 */
export function resolveVenueKitOffer(raw: Partial<Record<keyof VenueKitOffer, unknown>> | null | undefined): VenueKitOffer {
  const offer = { ...VENUE_KIT_FALLBACK_OFFER };
  for (const key of Object.keys(offer) as (keyof VenueKitOffer)[]) {
    const value = raw?.[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) offer[key] = value;
  }
  return offer;
}

/** The interpolation values every Venue Kit sentence reads (`{{price}}`, `{{labels}}`…). */
export interface VenueKitCopyVars {
  [key: string]: string | number;
  price: string;
  labels: number;
  extraLabelPrice: string;
  posMonths: number;
  giftCards: number;
  giftCardValue: string;
  giftCardTotal: string;
  collabDiscount: string;
  orderBenefit: string;
}

export function venueKitCopyVars(offer: Readonly<VenueKitOffer>): VenueKitCopyVars {
  return {
    price: venueKitRupees(offer.annual_price_paise),
    labels: offer.included_table_labels,
    extraLabelPrice: venueKitRupees(offer.extra_label_price_paise),
    posMonths: offer.pos_activation_months,
    giftCards: offer.gift_card_count,
    giftCardValue: venueKitRupees(offer.gift_card_value_paise),
    giftCardTotal: venueKitRupees(offer.gift_card_count * offer.gift_card_value_paise),
    collabDiscount: venueKitPercent(offer.collab_gift_card_discount_pct),
    orderBenefit: venueKitPercent(offer.order_benefit_pct),
  };
}

