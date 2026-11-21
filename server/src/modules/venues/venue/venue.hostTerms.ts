/**
 * A venue's Fees & Minimum Spend as a host weighs it before picking the venue
 * for a pod — the Venues list cards and Venue Details on mWeb and the app.
 *
 * Only an active host sees it (the rule Create Pod itself enforces,
 * `activeHostStatus`); anyone else gets an empty list, so a member browsing
 * venues sees the page they always had. Only APPROVED, active venues answer —
 * the ones Create Pod can offer.
 *
 * Never put the query that serves this on the shared response cache: what it
 * returns depends on who is asking.
 */
import { Types } from 'mongoose';
import { activeHostStatus } from '@modules/pods/pod/pod.validation';
import { pricingOf } from '@modules/venues/venuePricing/venuePricing.service';
import { VenueModel } from './venue.model';
import { effectiveOfferSettings, toOfferSettingsPub, type IVenueMinBusiness, type VenueOfferDefaults } from './venue.offerSettings';

/** More than any one screen lists (the Venues page shows at most 200, the app pages it). */
export const VENUE_HOST_TERMS_MAX_IDS = 200;

export interface VenueHostTerms {
  venue_id: string;
  min_guests: number;
  min_business: IVenueMinBusiness[];
  min_spend: number;
  cleaning_fee: number;
  pet_fee: number;
  deposit: number;
  gst_enabled: boolean;
}

const cleanIds = (ids: readonly unknown[] | null | undefined): Types.ObjectId[] => {
  const unique = [...new Set((ids ?? []).map(String))].filter((id) => Types.ObjectId.isValid(id));
  return unique.slice(0, VENUE_HOST_TERMS_MAX_IDS).map((id) => new Types.ObjectId(id));
};

/**
 * The terms of each venue asked for that a host may book, in the order asked.
 * `defaults` is the platform's offer defaults (min guests when a venue set none).
 */
export async function venueHostTermsFor(
  userId: string,
  venueIds: readonly unknown[] | null | undefined,
  defaults: () => Promise<VenueOfferDefaults>
): Promise<VenueHostTerms[]> {
  const ids = cleanIds(venueIds);
  if (ids.length === 0 || (await activeHostStatus(userId)) !== 'ACTIVE') return [];
  const [docs, platform] = await Promise.all([
    VenueModel.find({ _id: { $in: ids }, status: 'APPROVED', is_active: { $ne: false } })
      .select('settings.offers pricing')
      .lean(),
    defaults(),
  ]);
  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
  return ids.flatMap((id) => {
    const doc = byId.get(String(id));
    if (!doc) return [];
    const offers = doc.settings?.offers;
    const pub = toOfferSettingsPub(offers);
    const pricing = pricingOf(doc);
    return [
      {
        venue_id: String(id),
        min_guests: effectiveOfferSettings(offers, platform).min_guests,
        min_business: pub.min_business,
        min_spend: pub.min_spend,
        cleaning_fee: pricing.cleaning_fee,
        pet_fee: pricing.pet_fee,
        deposit: pricing.deposit,
        gst_enabled: pricing.gst_enabled,
      },
    ];
  });
}
