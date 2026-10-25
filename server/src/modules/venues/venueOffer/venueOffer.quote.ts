/**
 * Prices a host's offer with THE venue price calculation (quoteVenuePrice):
 * the offer supplies the model and the rate, the venue supplies its charges
 * (price rules, minimum spend, cleaning and pet fees, GST). Pure.
 *
 * Per guest is the calculator's PER_PAX. A per-slot offer is one price for the
 * picked window, which the calculator already prices as FLAT; the breakdown is
 * then labelled PER_SLOT so both sides see what was offered.
 */
import { quoteVenuePrice } from '@modules/venues/venuePricing/venuePricing.calc';
import type {
  QuoteRequest,
  QuoteResult,
  VenuePriceBreakdown,
  VenuePricing,
  VenuePricingModel,
} from '@modules/venues/venuePricing/venuePricing.types';
import {
  MAX_OFFER_RATE,
  VENUE_OFFER_MODELS,
  type OfferCharges,
  type VenueOfferTerms,
  type VenuePriceBasis,
} from './venueOffer.types';

const CALC_MODEL: Record<VenueOfferTerms['model'], VenuePricingModel> = {
  PER_GUEST: 'PER_PAX',
  PER_HOUR: 'PER_HOUR',
  PER_SLOT: 'FLAT',
  FLAT: 'FLAT',
};

/** Why these terms cannot be offered, or null when they can. */
export function termsProblem(terms: Partial<VenueOfferTerms> | null | undefined): string | null {
  if (!terms?.model || !(VENUE_OFFER_MODELS as readonly string[]).includes(terms.model)) {
    return 'Pick how you will pay the venue: per guest, per hour, per slot or a flat price';
  }
  const rate = Number(terms.rate);
  if (!Number.isFinite(rate) || rate <= 0) return 'Enter the amount you offer the venue';
  if (rate > MAX_OFFER_RATE) return 'This amount is too large';
  return null;
}

/** The venue's charges with the offer's model and rate in place of the venue's own. */
export function offerPricing(charges: VenuePricing, terms: VenueOfferTerms): VenuePricing {
  return {
    ...charges,
    model: CALC_MODEL[terms.model],
    base_rate: Math.round(Number(terms.rate) * 100) / 100,
    // The host names the guests and the hours; the venue no longer bounds them here.
    min_pax: 0,
    max_pax: 0,
    min_hours: 0,
    max_hours: 0,
    booking_increment_minutes: 0,
    slots: [],
    operating_hours: [],
  };
}

/** The offer, priced. Same inputs, same breakdown. */
export function quoteOffer(charges: VenuePricing, terms: VenueOfferTerms, req: QuoteRequest): QuoteResult {
  const result = quoteVenuePrice(offerPricing(charges, terms), req);
  if (!result.ok) return result;
  return { ok: true, breakdown: { ...result.breakdown, model: terms.model === 'PER_SLOT' ? 'PER_SLOT' : result.breakdown.model } };
}

/** The venue's charges as frozen beside a quote: the parts the calculation reads, without its own slots and hours. */
export const frozenCharges = (charges: VenuePricing): OfferCharges => ({ ...charges, slots: [], operating_hours: [] });

/**
 * A proposal priced at both ends of its guests: `quote` for the most (the
 * pod's spots) and `quote_min` for the fewest. Only a per-guest price moves
 * with the head count, but every model is priced twice so a venue rule that
 * charges by the guest still shows. Pure.
 */
export function quoteProposal(
  charges: VenuePricing,
  terms: VenueOfferTerms,
  req: QuoteRequest,
  minGuests: number
): { ok: true; quote: VenuePriceBreakdown; quote_min: VenuePriceBreakdown } | Extract<QuoteResult, { ok: false }> {
  const atMost = quoteOffer(charges, terms, req);
  if (!atMost.ok) return atMost;
  const fewest = Math.floor(minGuests);
  if (!(fewest >= 1 && fewest < req.pax)) return { ok: true, quote: atMost.breakdown, quote_min: atMost.breakdown };
  // The same window and charges were just priced: only the head count differs,
  // and every count from one up prices — so this one cannot fail.
  const atLeast = quoteOffer(charges, terms, { ...req, pax: fewest }) as Extract<QuoteResult, { ok: true }>;
  return { ok: true, quote: atMost.breakdown, quote_min: atLeast.breakdown };
}

/** The people an agreed per-guest booking is paid for: everyone who came, never fewer than its minimum. */
export const billableGuests = (minGuests: number, came: number) =>
  Math.max(Math.max(0, Math.floor(minGuests) || 0), Math.max(0, Math.floor(came) || 0), 1);

/**
 * An agreed PER_GUEST booking priced again for `guests` — the rate, the
 * minimum and the venue's charges frozen at accept, the GST and commission
 * percents the agreed quote carried. Null when the basis cannot be priced (a
 * booking frozen without its charges); the caller then keeps the agreed quote.
 */
export function priceForGuests(
  basis: VenuePriceBasis,
  window: { start: Date; end: Date },
  guests: number,
  agreed: Pick<VenuePriceBreakdown, 'gst_pct' | 'platform_fee_pct'>,
  timeZone: string
): VenuePriceBreakdown | null {
  if (basis.model !== 'PER_GUEST' || !basis.charges) return null;
  const result = quoteOffer(
    basis.charges,
    { model: basis.model, rate: basis.rate },
    {
      start: window.start,
      end: window.end,
      pax: billableGuests(basis.min_guests, guests),
      pets: basis.pets,
      gstPct: agreed.gst_pct,
      commissionPct: agreed.platform_fee_pct,
      timeZone,
    }
  );
  return result.ok ? result.breakdown : null;
}
