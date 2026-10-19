import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { rentalSettingsService } from './rentalSettings.service';
import { RentalStockModel } from './rentalStock.model';
import { RentalBookingModel, type IRentalBooking } from './rentalBooking.model';
import { hydrateRentalBookings } from './rentalBookingTable.service';
import { podRentalHours } from './rentalCheckout';
import { podLifecycleFilter } from '@modules/pods/pod/pod.lifecycle';
import { POD_VISIBLE_FILTER } from '@utils/hidden';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { resolveClubCategory } from '@modules/pods/pod/pod.products';
import { rentalItemFitsPod } from '@modules/venues/venue/venue.rentals';

/**
 * The guest-facing reads: what a pod's venue rents out right now, and the
 * guest's own rental history.
 */

const HOUR_MS = 3_600_000;
const MAX_PAGE = 50;

/** Why renting is closed for a pod, or null while it is open. */
export type RentalClosedReason = 'DISABLED' | 'NO_VENUE' | 'CUTOFF' | null;

function closedReason(
  pod: { venue_id?: unknown; pod_mode?: string | null; pod_date_time?: Date | null },
  settings: { enabled: boolean; booking_cutoff_hours: number },
  offers: boolean
): RentalClosedReason {
  if (!settings.enabled) return 'DISABLED';
  if (pod.pod_mode === 'VIRTUAL' || !pod.venue_id || !offers) return 'NO_VENUE';
  const start = pod.pod_date_time ? new Date(pod.pod_date_time).getTime() : Number.NaN;
  if (!Number.isNaN(start) && start - settings.booking_cutoff_hours * HOUR_MS <= Date.now()) return 'CUTOFF';
  return null;
}

const emptyCatalogue = async () => ({
  open: false,
  closed_reason: 'NO_VENUE' as RentalClosedReason,
  hours: 1,
  currency_symbol: (await getFinanceSettings()).currency_symbol,
  venue_terms_html: '',
  items: [],
});

async function podCatalogue(podId: string) {
  if (!Types.ObjectId.isValid(podId)) return emptyCatalogue();
  const pod = await PodModel.findById(podId).select('club_id venue_id pod_mode pod_date_time pod_end_date_time').lean();
  if (!pod) return emptyCatalogue();
  const [settings, finance, venue, podCategory] = await Promise.all([
    rentalSettingsService.get(),
    getFinanceSettings(),
    pod.venue_id ? VenueModel.findById(pod.venue_id).select('offers_rentals rental_items rental_terms_html').lean() : null,
    resolveClubCategory(pod.club_id),
  ]);
  // Only the items the venue offers under this pod's category: a racket never shows on a book club.
  const offered = (venue?.rental_items ?? []).filter((i) => i.is_available !== false && rentalItemFitsPod(i, podCategory));
  const reason = closedReason(pod, settings, venue?.offers_rentals === true && offered.length > 0);
  const listed = reason === 'NO_VENUE' ? [] : offered;
  const stock = await RentalStockModel.find({ pod_id: pod._id, item_id: { $in: listed.map((i) => i._id) } })
    .select('item_id booked')
    .lean();
  const booked = new Map(stock.map((row) => [String(row.item_id), row.booked ?? 0]));
  return {
    open: reason === null,
    closed_reason: reason,
    hours: podRentalHours(pod),
    currency_symbol: finance.currency_symbol,
    venue_terms_html: reason === 'NO_VENUE' ? '' : (venue?.rental_terms_html ?? ''),
    items: listed.map((item) => ({
      id: item._id.toHexString(),
      name: item.name,
      description: item.description ?? '',
      images: item.images ?? [],
      unit: item.unit ?? 'SLOT',
      rate: item.rate,
      deposit: item.deposit ?? 0,
      available: Math.max(0, item.stock - (booked.get(item._id.toHexString()) ?? 0)),
      per_guest_limit: item.per_guest_limit ?? 1,
    })),
  };
}

async function myBookings(userId: string, limit?: number | null, offset?: number | null) {
  const take = Math.min(MAX_PAGE, Math.max(1, Math.floor(Number(limit) || 20)));
  const skip = Math.max(0, Math.floor(Number(offset) || 0));
  const rows = await RentalBookingModel.find({ user_id: new Types.ObjectId(userId) })
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(take)
    .lean<IRentalBooking[]>();
  return hydrateRentalBookings(rows);
}

const RENTABLE_LIMIT = 20;

/**
 * Upcoming pods a guest can still rent items for — Pod Rent on /shop. Paid,
 * visible, at a venue that rents something, and before the booking cut-off.
 * Soonest first; the guest picks a pod and rents on its page.
 */
async function rentablePods(limit?: number | null) {
  const settings = await rentalSettingsService.get();
  if (!settings.enabled) return [];
  const venues = await VenueModel.find({ offers_rentals: true, 'rental_items.is_available': true })
    .select('venue_name rental_items')
    .lean();
  if (venues.length === 0) return [];
  const byVenue = new Map(venues.map((v) => [String(v._id), v]));
  const now = new Date();
  const opensUntil = new Date(now.getTime() + settings.booking_cutoff_hours * HOUR_MS);
  const pods = await PodModel.find({
    ...podLifecycleFilter('UPCOMING', now),
    ...POD_VISIBLE_FILTER,
    venue_id: { $in: venues.map((v) => v._id) },
    pod_mode: 'PHYSICAL',
    pod_amount: { $gt: 0 },
    pod_date_time: { $gt: opensUntil },
  })
    .sort({ pod_date_time: 1 })
    .limit(Math.min(RENTABLE_LIMIT, Math.max(1, Math.floor(Number(limit) || RENTABLE_LIMIT))))
    .select('pod_id club_id pod_title pod_date_time venue_id pod_images_and_videos')
    .lean();
  // The pod link is /club/<club public id>/pod/<pod public id>: one read for every club.
  const { ClubModel } = await import('@modules/clubs/club/club.model');
  const clubs = await ClubModel.find({ _id: { $in: pods.map((p) => p.club_id) } })
    .select('club_id super_category_id category_id')
    .lean();
  const clubSlug = new Map(clubs.map((c) => [String(c._id), c.club_id]));
  // A club stores its Sub in `category_id` (pod.products `resolveClubCategory`).
  const clubCategory = new Map(
    clubs.map((c) => [
      String(c._id),
      {
        super_category_id: c.super_category_id ? String(c.super_category_id) : null,
        sub_category_id: c.category_id ? String(c.category_id) : null,
      },
    ])
  );
  const { currency_symbol } = await getFinanceSettings();
  const rows = pods.map((pod) => {
    const venue = byVenue.get(String(pod.venue_id));
    const category = clubCategory.get(String(pod.club_id)) ?? null;
    const items = (venue?.rental_items ?? []).filter(
      (item) => item.is_available !== false && rentalItemFitsPod(item, category)
    );
    return {
      id: String(pod._id),
      pod_id: pod.pod_id,
      club_id: clubSlug.get(String(pod.club_id)) ?? '',
      pod_title: pod.pod_title ?? '',
      pod_date_time: pod.pod_date_time ? new Date(pod.pod_date_time).toISOString() : null,
      cover_url: (pod.pod_images_and_videos ?? []).find((media) => media?.url)?.url ?? '',
      venue_name: venue?.venue_name ?? '',
      item_count: items.length,
      from_rate: items.length ? Math.min(...items.map((item) => item.rate)) : 0,
      currency_symbol,
    };
  });
  // A pod whose venue offers nothing under its category has nothing to rent.
  return rows.filter((row) => row.item_count > 0);
}

export const rentalCatalogueService = { podCatalogue, myBookings, rentablePods };
