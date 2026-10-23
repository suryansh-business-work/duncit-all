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
import type { QuoteRequest, QuoteResult, VenuePricing, VenuePricingModel } from '@modules/venues/venuePricing/venuePricing.types';
import { MAX_OFFER_RATE, VENUE_OFFER_MODELS, type VenueOfferTerms } from './venueOffer.types';

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
