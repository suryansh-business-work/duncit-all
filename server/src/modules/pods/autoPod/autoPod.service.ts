import { Types } from 'mongoose';
import { AutoPodModel, type IAutoPod } from './autoPod.model';
import {
  ACTIVE_FILTER,
  autoPodEvent,
  autoPodFail,
  isAutoPodComplete,
  pendingBaseFilter,
  PHYSICAL_FILTER,
  PRE_LIVE_FILTER,
  PRE_LIVE_STAGES,
} from './autoPod.common';
import { autoPodCityLabel, locationScope, snapshotAutoPodLocation } from './autoPod.location';
import { autoPodNotify } from './autoPod.notify';
import { CategoryModel } from '@modules/pods/category/category.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import {
  buildProductRequests,
  validateFutureDates,
  validateHasImage,
  validateMeetingDetails,
} from '@modules/pods/pod/pod.service';
import { breakdownService, venueSlotProjections } from '@modules/finance/finance/breakdown.service';
import { ensureOwnedVenue, venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { logs } from '@observability/log';

export { autoPodEvent, autoPodFail, PRE_LIVE_STAGES };

/** What a role's queue may be narrowed to. */
export interface AutoPodQueueScope {
  location_id?: string | null;
  sub_category_id?: string | null;
  /** Venue queue only: one of the caller's venues, so the list is what THAT
   * venue could accept (its category, its city) rather than the union. */
  venue_id?: string | null;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * When a physical offer leaves venues' lists (and expires) if none accepts it:
 * created_at plus the Pod Settings window. Null once a venue is on it, on a
 * virtual offer, and once the offer is no longer enrolling.
 */
function venueExpiresAt(doc: IAutoPod, venueExpiryHours: number): string | null {
  if (doc.pod_mode === 'VIRTUAL' || doc.venue_claim) return null;
  if (!PRE_LIVE_STAGES.includes(doc.stage as any)) return null;
  return new Date(doc.created_at.getTime() + venueExpiryHours * HOUR_MS).toISOString();
}

/** "Sports", "Racket", "Badminton" — the names walked up from the sub-category. */
export async function categoryPathOf(subCategoryId: string): Promise<string[]> {
  const names: string[] = [];
  let id: string | null = subCategoryId;
  for (let level = 0; level < 3 && id && Types.ObjectId.isValid(id); level += 1) {
    const node: any = await CategoryModel.findById(id).select('name parent_id').lean();
    if (!node) break;
    names.unshift(node.name ?? '');
    id = node.parent_id ? String(node.parent_id) : null;
  }
  return names;
}

/** A club the caller administers, with what it can claim on. */
export interface AdminClub {
  id: Types.ObjectId;
  categoryId: Types.ObjectId | null;
  locationId: Types.ObjectId | null;
}

/** A venue the caller owns, with what it can accept: its sub-category and its city. */
export interface OwnerVenue {
  id: Types.ObjectId;
  subCategoryId: Types.ObjectId | null;
  locationId: Types.ObjectId | null;
}

/** The template's mode, read the one way every writer reads it. */
const modeOf = (input: { pod_mode?: string | null }) =>
  input.pod_mode === 'VIRTUAL' ? 'VIRTUAL' : 'PHYSICAL';

export const autoPodToPub = (d: IAutoPod | null) => {
  if (!d) return null;
  const venue = d.venue_claim;
  const host = d.host_claim;
  const club = d.club_claim;
  const location = d.location;
  return {
    id: String(d._id),
    auto_pod_no: d.auto_pod_no,
    stage: d.stage,
    is_active: d.is_active !== false,
    pod_title: d.pod_title,
    pod_description: d.pod_description ?? '',
    pod_info: d.pod_info ?? '',
    pod_hashtag: d.pod_hashtag ?? [],
    pod_images_and_videos: (d.pod_images_and_videos ?? []).map((m) => ({
      url: m.url,
      type: m.type ?? 'IMAGE',
    })),
    reel_url: d.reel_url ?? null,
    super_category_id: String(d.super_category_id),
    sub_category_id: String(d.sub_category_id),
    pod_mode: d.pod_mode ?? 'PHYSICAL',
    meeting_platform: d.meeting_platform ?? null,
    meeting_url: d.meeting_url ?? null,
    meeting_notes: d.meeting_notes ?? null,
    pod_date_time: d.pod_date_time?.toISOString?.() ?? null,
    pod_end_date_time: d.pod_end_date_time?.toISOString?.() ?? null,
    pod_type: d.pod_type ?? 'PAID',
    pod_amount: d.pod_amount ?? 0,
    no_of_spots: d.no_of_spots ?? 0,
    pod_occurrence: d.pod_occurrence ?? 'ONE_TIME',
    what_this_pod_offers: d.what_this_pod_offers ?? [],
    available_perks: d.available_perks ?? [],
    payment_terms: d.payment_terms ?? null,
    place_charges: (d.place_charges ?? []).map((c) => ({
      label: c.label,
      amount: c.amount ?? 0,
      note: c.note ?? null,
    })),
    products_enabled: !!d.products_enabled,
    product_requests: (d.product_requests ?? []).map((item) => ({
      product_id: String(item.product_id),
      quantity: item.quantity ?? 0,
    })),
    venue_claim: venue
      ? {
          venue_id: String(venue.venue_id),
          venue_slot_id: String(venue.venue_slot_id),
          owner_user_id: String(venue.owner_user_id),
          venue_name: venue.venue_name ?? '',
          pod_date_time: venue.pod_date_time?.toISOString?.() ?? '',
          pod_end_date_time: venue.pod_end_date_time?.toISOString?.() ?? null,
          slot_price: venue.slot_price ?? 0,
          accepted_at: venue.accepted_at?.toISOString?.() ?? '',
        }
      : null,
    host_claim: host
      ? {
          user_id: String(host.user_id),
          host_name: host.host_name ?? '',
          assigned_at: host.assigned_at?.toISOString?.() ?? '',
        }
      : null,
    club_claim: club
      ? {
          club_id: String(club.club_id),
          club_name: club.club_name ?? '',
          user_id: String(club.user_id),
          claimed_at: club.claimed_at?.toISOString?.() ?? '',
        }
      : null,
    location: location
      ? {
          location_id: String(location.location_id),
          location_name: location.location_name ?? '',
          country: location.country ?? '',
          state: location.state ?? '',
          city: location.city ?? '',
          bound_by: location.bound_by,
          bound_at: location.bound_at?.toISOString?.() ?? '',
        }
      : null,
    pod_id: d.pod_id ? String(d.pod_id) : null,
    materialized_at: d.materialized_at?.toISOString?.() ?? null,
    cancel_reason: d.cancel_reason || null,
    cancelled_at: d.cancelled_at?.toISOString?.() ?? null,
    events: (d.events ?? []).map((e) => ({
      action: e.action,
      actor_user_id: e.actor_user_id ? String(e.actor_user_id) : null,
      actor_name: e.actor_name ?? '',
      note: e.note ?? '',
      at: e.at?.toISOString?.() ?? '',
    })),
    created_at: d.created_at?.toISOString?.() ?? '',
    updated_at: d.updated_at?.toISOString?.() ?? '',
  };
};

/** DUNCIT TABLE CONTRACT v1 allowlist for adminAutoPodsTable. */
const AUTO_POD_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['pod_title', 'auto_pod_no', 'location.city'],
  sortFields: {
    pod_title: 'pod_title',
    auto_pod_no: 'auto_pod_no',
    stage: 'stage',
    pod_amount: 'pod_amount',
    no_of_spots: 'no_of_spots',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    stage: { type: 'enum' },
    pod_mode: { type: 'enum' },
    is_active: { type: 'boolean' },
    sub_category_id: { type: 'string' },
    super_category_id: { type: 'string' },
    pod_amount: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/**
 * A pod's category is its club's Super + Sub, and an Auto Pod has no club until
 * a club admin claims it — so the admin picks the SUB up front and only clubs
 * carrying that sub-category may claim it. This resolves the Super from the
 * category tree (SUB → CATEGORY → SUPER) so the pair is fixed at creation.
 */
export async function resolveCategoryPair(subCategoryId: string) {
  if (!Types.ObjectId.isValid(subCategoryId)) {
    autoPodFail('BAD_USER_INPUT', 'Select a category');
  }
  const sub: any = await CategoryModel.findById(subCategoryId)
    .select('name level parent_id min_pax')
    .lean();
  if (sub?.level !== 'SUB') {
    autoPodFail('BAD_USER_INPUT', 'Select a valid sub-category');
  }
  const middle: any = sub.parent_id
    ? await CategoryModel.findById(sub.parent_id).select('parent_id').lean()
    : null;
  const superId = middle?.parent_id ? String(middle.parent_id) : null;
  if (!superId) {
    autoPodFail('BAD_USER_INPUT', 'This sub-category is not linked to a super category');
  }
  return { superCategoryId: superId, subName: sub.name as string, minPax: (sub.min_pax ?? 0) as number };
}

/**
 * The economics picture the template is checked against: whoever has enrolled
 * so far. On a fresh template both are null and the check is a sanity run on
 * default rates; once a venue has priced a slot or a host is on it, their real
 * figures are what the price and spot count must still cover.
 */
function enrolledEconomics(doc: IAutoPod | null) {
  return {
    hostUserId: doc?.host_claim ? String(doc.host_claim.user_id) : null,
    venueId: doc?.venue_claim ? String(doc.venue_claim.venue_id) : null,
    venueAmount: doc?.venue_claim?.slot_price ?? 0,
  };
}

/** The products a template carries, as the pod will: id + quantity, no zero rows. */
const productRequestsOf = (input: any) =>
  ((input.product_requests ?? []) as any[])
    .map((item) => ({ product_id: String(item?.product_id ?? ''), quantity: Number(item?.quantity) || 0 }))
    .filter((item) => item.product_id && item.quantity > 0);

/**
 * The mode-specific half of the template: a virtual offer must already carry
 * what its venue would otherwise bring — a meeting link and a future window —
 * and, like every virtual pod, it can carry no products. The products of a
 * physical offer are checked against the category the pod will inherit, with
 * the same gate that would refuse them when the pod is created.
 */
async function validateModeFields(
  input: any,
  category: { superCategoryId: string; subCategoryId: string }
) {
  const requests = productRequestsOf(input);
  if (modeOf(input) === 'VIRTUAL') {
    validateMeetingDetails('VIRTUAL', input);
    validateFutureDates(input.pod_date_time, input.pod_end_date_time, true);
    if (requests.length > 0) autoPodFail('BAD_USER_INPUT', 'A virtual pod cannot carry products');
    return;
  }
  if (requests.length > 0) {
    await buildProductRequests(true, requests, {
      super_category_id: category.superCategoryId,
      sub_category_id: category.subCategoryId,
    });
  }
}

/** The template must be viable BEFORE anyone else commits to it. */
async function validateTemplate(
  input: any,
  minPax: number,
  doc: IAutoPod | null,
  category: { superCategoryId: string; subCategoryId: string }
) {
  const title = String(input.pod_title ?? '').trim();
  if (title.length < 3) autoPodFail('BAD_USER_INPUT', 'Title is too short');
  if (!String(input.pod_description ?? '').trim()) {
    autoPodFail('BAD_USER_INPUT', 'Description is required');
  }
  validateHasImage(input.pod_images_and_videos);
  await validateModeFields(input, category);
  const amount = Number(input.pod_amount) || 0;
  // An Auto Pod may never be free — so unlike an ordinary pod the floor here
  // is 1, not 0.
  if (amount < 1 || amount > 1999) {
    autoPodFail('BAD_USER_INPUT', 'Ticket price must be between 1 and 1999');
  }
  const spots = Number(input.no_of_spots) || 0;
  // The host occupies one spot for free, so a 1-spot pod bills nobody and can
  // never cover a venue.
  if (spots < 2) autoPodFail('BAD_USER_INPUT', 'An Auto Pod needs at least 2 spots');
  if (minPax > 0 && spots < minPax) {
    autoPodFail(
      'BAD_USER_INPUT',
      `This activity needs at least ${minPax} people — increase the number of spots`
    );
  }
  await breakdownService.assertViablePodEconomics({
    ...enrolledEconomics(doc),
    podAmount: amount,
    noOfSpots: spots,
  });
}

const TEMPLATE_FIELDS = [
  'pod_title',
  'pod_description',
  'pod_info',
  'pod_hashtag',
  'pod_images_and_videos',
  'reel_url',
  'pod_mode',
  'meeting_platform',
  'meeting_url',
  'meeting_notes',
  'pod_date_time',
  'pod_end_date_time',
  'pod_amount',
  'no_of_spots',
  'pod_occurrence',
  'what_this_pod_offers',
  'available_perks',
  'payment_terms',
  'place_charges',
] as const;

/**
 * The club a Club Admin is opening an Auto Pod FOR. A pod inherits its Super +
 * Sub from its club and is pinned to the club's city, so a club missing either
 * could never materialize — it is refused here rather than at the last
 * enrolment.
 */
async function loadOpeningClub(clubId: string) {
  if (!Types.ObjectId.isValid(clubId)) autoPodFail('BAD_USER_INPUT', 'Invalid club_id');
  const club: any = await ClubModel.findById(clubId)
    .select('club_name category_id location_id is_active')
    .lean();
  if (!club || club.is_active === false) {
    autoPodFail('BAD_USER_INPUT', 'That club is not active');
  }
  if (!club.category_id) {
    autoPodFail('BAD_USER_INPUT', 'Set a category on this club before opening an Auto Pod');
  }
  if (!club.location_id) {
    autoPodFail('BAD_USER_INPUT', 'Set a location on this club before opening an Auto Pod');
  }
  return club;
}

/** Only non-empty clauses go into an `$and` — an empty object there is noise. */
const andOf = (...clauses: Record<string, unknown>[]) => {
  const real = clauses.filter((clause) => Object.keys(clause).length > 0);
  return real.length > 0 ? { $and: real } : {};
};

export const autoPodService = {
  /**
   * `clubId` set means a Club Admin opened this for their own club: that club is
   * enrolled at creation (so only a venue and a host are still needed), the
   * category is taken from the club rather than from the input, and the offer
   * is pinned to the club's city — the marketplace can no longer hand the pod
   * to a different club or a different city.
   */
  async create(actorUserId: string, input: any, clubId?: string | null) {
    const club = clubId ? await loadOpeningClub(clubId) : null;
    const subCategoryId = club ? String(club.category_id) : input.sub_category_id;
    const { superCategoryId, minPax } = await resolveCategoryPair(subCategoryId);
    await validateTemplate(input, minPax, null, { superCategoryId, subCategoryId });
    const mode = modeOf(input);
    const virtual = mode === 'VIRTUAL';
    const requests = productRequestsOf(input);

    const clubClaim = club
      ? {
          club_id: club._id,
          club_name: club.club_name ?? '',
          user_id: new Types.ObjectId(actorUserId),
          claimed_at: new Date(),
        }
      : null;
    const location = club
      ? await snapshotAutoPodLocation(
          club.location_id,
          'CLUB',
          'Set a location on this club before opening an Auto Pod'
        )
      : null;
    const openedNote = (() => {
      if (club) return `Auto Pod opened — already claimed by its club, pinned to ${autoPodCityLabel(location)}`;
      if (virtual) return 'Virtual Auto Pod opened for hosts and club admins';
      return 'Auto Pod opened for venues, hosts and club admins';
    })();

    const doc = await AutoPodModel.create({
      stage: club ? 'CLAIMING' : 'OPEN',
      created_by: new Types.ObjectId(actorUserId),
      pod_title: String(input.pod_title).trim(),
      pod_description: input.pod_description,
      pod_info: input.pod_info ?? '',
      pod_hashtag: input.pod_hashtag ?? [],
      pod_images_and_videos: input.pod_images_and_videos ?? [],
      reel_url: input.reel_url ?? null,
      super_category_id: new Types.ObjectId(superCategoryId),
      sub_category_id: new Types.ObjectId(subCategoryId),
      pod_mode: mode,
      meeting_platform: virtual ? input.meeting_platform?.trim() || null : null,
      meeting_url: virtual ? input.meeting_url?.trim() || null : null,
      meeting_notes: virtual ? input.meeting_notes?.trim() || null : null,
      pod_date_time: virtual ? new Date(input.pod_date_time) : null,
      pod_end_date_time: virtual ? new Date(input.pod_end_date_time) : null,
      pod_type: 'PAID',
      pod_amount: input.pod_amount,
      no_of_spots: input.no_of_spots,
      pod_occurrence: input.pod_occurrence ?? 'ONE_TIME',
      what_this_pod_offers: input.what_this_pod_offers ?? [],
      available_perks: input.available_perks ?? [],
      payment_terms: input.payment_terms ?? null,
      place_charges: input.place_charges ?? [],
      products_enabled: requests.length > 0,
      product_requests: requests.map((item) => ({
        product_id: new Types.ObjectId(item.product_id),
        quantity: item.quantity,
      })),
      club_claim: clubClaim,
      location,
      events: [
        autoPodEvent('CREATE', actorUserId, '', openedNote),
        ...(club
          ? [autoPodEvent('CLUB_ENROLL', actorUserId, club.club_name ?? '', 'Opened by its club admin')]
          : []),
      ],
    });

    autoPodNotify.opened(doc).catch((error) =>
      logs.server.error('autoPod', 'notifyOpened', { error, auto_pod_id: String(doc._id) })
    );
    return autoPodToPub(doc);
  },

  /**
   * Edits are allowed until the pod is live. Whoever has already enrolled did so
   * on this template, so the economics are re-checked against THEIR figures
   * (the venue's slot price, the host's rates) and a price or spot count that
   * no longer covers them is refused. The category is locked once a host or a
   * club is on it: both enrolled on the strength of that category.
   *
   * The write is CONDITIONAL on what was checked: still pre-live, and — when
   * the category moves — still without a host or a club. A claim that lands
   * between the read and the write makes the write miss, rather than letting
   * a host end up on a category they were never approved for.
   *
   * A template fixed after a failed materialization (the usual cause is
   * pricing) is taken live here, because no claim is left to trigger it.
   */
  async update(actorUserId: string, autoPodId: string, input: any) {
    const doc = await this.loadById(autoPodId);
    if (!PRE_LIVE_STAGES.includes(doc.stage as any)) {
      autoPodFail('BAD_REQUEST', 'This Auto Pod is no longer editable');
    }
    const locked = doc.host_claim || doc.club_claim ? String(doc.sub_category_id) : null;
    const subCategoryId = locked ?? input.sub_category_id ?? String(doc.sub_category_id);
    if (locked && input.sub_category_id && input.sub_category_id !== locked) {
      autoPodFail(
        'BAD_REQUEST',
        'A host or club has already enrolled on this category — it cannot be changed now'
      );
    }
    const { superCategoryId, minPax } = await resolveCategoryPair(subCategoryId);
    const merged: any = { ...autoPodToPub(doc), ...input };
    await validateTemplate(merged, minPax, doc, { superCategoryId, subCategoryId });

    const set: Record<string, unknown> = {
      super_category_id: new Types.ObjectId(superCategoryId),
      sub_category_id: new Types.ObjectId(subCategoryId),
    };
    for (const field of TEMPLATE_FIELDS) {
      if (input[field] !== undefined) set[field] = input[field];
    }
    if (input.product_requests !== undefined) {
      const requests = productRequestsOf(input);
      set.products_enabled = requests.length > 0;
      set.product_requests = requests.map((item) => ({
        product_id: new Types.ObjectId(item.product_id),
        quantity: item.quantity,
      }));
    }
    const categoryChanged = subCategoryId !== String(doc.sub_category_id);
    const updated = await AutoPodModel.findOneAndUpdate(
      {
        _id: doc._id,
        ...PRE_LIVE_FILTER,
        ...(categoryChanged ? { host_claim: null, club_claim: null } : {}),
      },
      { $set: set, $push: { events: autoPodEvent('UPDATE', actorUserId) } },
      { new: true }
    );
    if (!updated) {
      autoPodFail(
        'CONFLICT',
        'This Auto Pod changed while you were editing it — refresh and try again'
      );
    }
    if (!isAutoPodComplete(updated)) return autoPodToPub(updated);
    const { materializeAutoPod } = await import('./autoPod.claims');
    try {
      return autoPodToPub(await materializeAutoPod(String(updated._id), actorUserId));
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'the pod could not be created';
      autoPodFail('BAD_REQUEST', `Saved, but the pod could not go live yet: ${reason}`);
    }
  },

  /**
   * Admin pulls an Auto Pod before it goes live. The stage flip is CONDITIONAL,
   * so a claim racing its way to materialization either wins (and this reports
   * the pod is already live) or loses cleanly — the slot is only released once
   * the cancel is the write that landed.
   */
  async cancel(actorUserId: string, autoPodId: string, reason?: string | null) {
    const doc = await this.loadById(autoPodId);
    const cancelled = await AutoPodModel.findOneAndUpdate(
      { _id: doc._id, ...PRE_LIVE_FILTER },
      {
        $set: {
          stage: 'CANCELLED',
          cancelled_at: new Date(),
          cancelled_by: new Types.ObjectId(actorUserId),
          cancel_reason: (reason ?? '').trim(),
        },
        $push: { events: autoPodEvent('CANCEL', actorUserId, '', (reason ?? '').trim()) },
      },
      { new: true }
    );
    if (!cancelled) {
      const now = await this.loadById(autoPodId);
      if (now.stage === 'CANCELLED' || now.stage === 'EXPIRED') {
        autoPodFail('CONFLICT', `This Auto Pod is already ${now.stage.toLowerCase()}`);
      }
      autoPodFail(
        'CONFLICT',
        'This Auto Pod is already live — cancel the pod itself instead'
      );
    }
    await venueSlotService.releaseForAutoPod(String(doc._id));
    autoPodNotify.cancelled(cancelled).catch((error) =>
      logs.server.error('autoPod', 'notifyCancelled', { error, auto_pod_id: autoPodId })
    );
    return autoPodToPub(cancelled);
  },

  /**
   * Removes the record for good. A live Auto Pod is refused — its pod exists
   * and is deleted from the Pods page, where the bookings are. A pre-live offer
   * is cancelled FIRST, so everyone enrolled is told, before the row itself
   * goes; the delete is conditional on that cancel having landed, so a claim
   * racing to materialization cannot be deleted out from under a pod it just
   * created. The venue's slot is released again right before the row goes,
   * because a slot still held by a row that no longer exists could never be
   * freed by anything else.
   */
  async delete(actorUserId: string, autoPodId: string): Promise<boolean> {
    const doc = await this.loadById(autoPodId);
    if (doc.stage === 'LIVE') {
      autoPodFail('CONFLICT', 'This Auto Pod is live — delete the pod itself instead');
    }
    if (doc.stage === 'MATERIALIZING') {
      autoPodFail('CONFLICT', 'This Auto Pod is being turned into a pod — try again in a moment');
    }
    if (PRE_LIVE_STAGES.includes(doc.stage as any)) {
      await this.cancel(actorUserId, autoPodId, 'Deleted by admin');
    }
    await venueSlotService.releaseForAutoPod(String(doc._id));
    const result = await AutoPodModel.deleteOne({
      _id: doc._id,
      stage: { $in: ['CANCELLED', 'EXPIRED'] },
    });
    if (result.deletedCount !== 1) {
      autoPodFail('CONFLICT', 'This Auto Pod changed while it was being deleted — refresh and retry');
    }
    logs.server.info('autoPod', 'delete', {
      auto_pod_id: autoPodId,
      auto_pod_no: doc.auto_pod_no,
      actor_user_id: actorUserId,
    });
    return true;
  },

  async loadById(autoPodId: string): Promise<IAutoPod> {
    if (!Types.ObjectId.isValid(autoPodId)) {
      autoPodFail('BAD_USER_INPUT', 'Invalid auto_pod_doc_id');
    }
    const doc = await AutoPodModel.findById(autoPodId);
    if (!doc) autoPodFail('NOT_FOUND', 'Auto Pod not found');
    return doc!;
  },

  async getById(autoPodId: string) {
    return autoPodToPub(await this.loadById(autoPodId));
  },

  /**
   * The admin console table. Its "pending" filter is not a field — it asks for
   * offers still waiting on a role — so it is lifted out of the client's
   * filters and becomes the base clause; the allowlisted fields go through the
   * engine as usual.
   */
  async table(input?: TableQueryInput | null) {
    const filters = input?.filters ?? [];
    const roles = filters
      .filter((f) => f.field === 'pending')
      .flatMap((f) => (f.values?.length ? f.values : [f.value ?? '']));
    const query = input ? { ...input, filters: filters.filter((f) => f.field !== 'pending') } : input;
    const { docs, total, page, page_size } = await runTableQuery<any>(
      AutoPodModel,
      pendingBaseFilter(roles) ?? {},
      query,
      AUTO_POD_TABLE_CONFIG
    );
    return { rows: docs.map(autoPodToPub), total, page, page_size };
  },

  /**
   * The two Auto Pod windows from Pod Settings, and the instant before which a
   * venue-less offer is already off venues' lists. Read once per request, never
   * per row.
   */
  async windows() {
    const settings = await settingsService.getAppSettings();
    const venueExpiryHours = settings.auto_pod_venue_expiry_hours;
    return {
      slotWindowDays: settings.auto_pod_slot_window_days,
      venueExpiryHours,
      venueCutoff: new Date(Date.now() - venueExpiryHours * HOUR_MS),
    };
  },

  /**
   * Admin pauses or resumes an offer. Paused, it is offered to nobody and no
   * claim lands on it; resumed, whoever is still missing is told again. Only
   * an offer still enrolling can be toggled — a live one is a pod, and a
   * cancelled or expired one is over.
   */
  async setActive(actorUserId: string, autoPodId: string, isActive: boolean) {
    const doc = await this.loadById(autoPodId);
    if (!PRE_LIVE_STAGES.includes(doc.stage as any)) {
      autoPodFail('BAD_REQUEST', 'Only an Auto Pod still enrolling can be paused or resumed');
    }
    if ((doc.is_active !== false) === isActive) return autoPodToPub(doc);
    const note = isActive ? 'Resumed — offered to partners again' : 'Paused — offered to nobody until resumed';
    const updated = await AutoPodModel.findOneAndUpdate(
      { _id: doc._id, ...PRE_LIVE_FILTER },
      {
        $set: { is_active: isActive },
        $push: { events: autoPodEvent(isActive ? 'RESUME' : 'PAUSE', actorUserId, '', note) },
      },
      { new: true }
    );
    if (!updated) {
      autoPodFail('CONFLICT', 'This Auto Pod changed while you were editing it — refresh and try again');
    }
    if (isActive) {
      autoPodNotify.opened(updated).catch((error) =>
        logs.server.error('autoPod', 'notifyResumed', { error, auto_pod_id: autoPodId })
      );
    }
    return autoPodToPub(updated);
  },

  /**
   * The free slots one of the caller's venues could commit to an offer: the
   * next `auto_pod_slot_window_days` days, nearest first, each priced as the
   * venue would be PAID — the slot price less the venue commission Finance
   * deducts (under the enrolled host's rates when there is one, the platform
   * defaults otherwise). A slot the pod's money could not cover is flagged
   * rather than hidden, so the venue learns why it cannot be chosen.
   */
  async venueSlots(userId: string, autoPodId: string, venueId: string) {
    const doc = await this.loadById(autoPodId);
    if (doc.pod_mode === 'VIRTUAL') {
      autoPodFail('BAD_REQUEST', 'A virtual Auto Pod has no venue — it needs only a host and a club');
    }
    if (!PRE_LIVE_STAGES.includes(doc.stage as any) || doc.venue_claim) {
      autoPodFail('CONFLICT', 'This Auto Pod has already been accepted by another venue.');
    }
    const venue = await ensureOwnedVenue(userId, venueId);
    const { slotWindowDays, venueExpiryHours } = await this.windows();
    const until = Date.now() + slotWindowDays * DAY_MS;
    const available = await venueSlotService.listAvailable(String(venue._id));
    const inWindow = available.filter((slot) => new Date(slot.start_at).getTime() <= until);
    const projections = await venueSlotProjections({
      hostUserId: doc.host_claim ? String(doc.host_claim.user_id) : null,
      venueId: String(venue._id),
      podAmount: doc.pod_amount ?? 0,
      noOfSpots: doc.no_of_spots ?? 0,
      slotPrices: inWindow.map((slot) => slot.price),
    });
    return {
      window_days: slotWindowDays,
      expires_at: venueExpiresAt(doc, venueExpiryHours),
      slots: inWindow.map((slot, index) => ({
        id: slot.id,
        start_at: slot.start_at,
        end_at: slot.end_at,
        whole_day: slot.whole_day,
        space_label: slot.space_label,
        capacity: slot.capacity,
        price: slot.price,
        ...projections[index],
      })),
    };
  },

  /**
   * The approved, active venues this user owns, with the sub-category each one
   * hosts and the city it sits in. An offer is only ever offered to a venue in
   * its category and — once pinned — its city, so those pairs are what the
   * queue and the count are scoped by.
   */
  async ownerVenues(userId: string): Promise<OwnerVenue[]> {
    if (!Types.ObjectId.isValid(userId)) return [];
    const venues = await VenueModel.find({
      owner_user_id: new Types.ObjectId(userId),
      status: 'APPROVED',
      is_active: true,
    })
      .select('location_id venue_category.sub_category_id')
      .lean();
    return (venues as any[]).map((v) => ({
      id: v._id,
      subCategoryId: v.venue_category?.sub_category_id ?? null,
      locationId: v.location_id ?? null,
    }));
  },

  /** Sub-categories this user is an approved, active host in. */
  async hostSubCategoryIds(userId: string): Promise<Types.ObjectId[]> {
    if (!Types.ObjectId.isValid(userId)) return [];
    const hosts = await HostModel.find({
      user_id: new Types.ObjectId(userId),
      status: 'APPROVED',
      is_active: true,
    })
      .select('host_categories')
      .lean();
    const ids = new Map<string, Types.ObjectId>();
    for (const host of hosts as any[]) {
      for (const row of host.host_categories ?? []) {
        if (row?.sub_category_id) ids.set(String(row.sub_category_id), row.sub_category_id);
      }
    }
    return [...ids.values()];
  },

  /** The caller's clubs, with the sub-category and city each one carries. */
  async adminClubs(userId: string): Promise<AdminClub[]> {
    if (!Types.ObjectId.isValid(userId)) return [];
    const clubs = await ClubModel.find({
      admin_user_ids: new Types.ObjectId(userId),
      is_active: true,
    })
      .select('category_id location_id')
      .lean();
    return (clubs as any[]).map((c) => ({
      id: c._id,
      categoryId: c.category_id ?? null,
      locationId: c.location_id ?? null,
    }));
  },

  /**
   * Pre-live PHYSICAL offers with no venue yet that one of these venues could
   * take: the offer's category must be THAT venue's, and its city (once pinned)
   * that venue's too — a pair per venue, exactly as clubs are matched. A venue
   * that declares no category matches nothing. Offers older than the venue
   * window (`venueCutoff`) are off the list — the sweep expires them. Null
   * when no venue could match.
   */
  venueOpenFilter(venues: OwnerVenue[], venueCutoff: Date, scope?: AutoPodQueueScope) {
    const perVenue = venues
      .filter((venue) => venue.subCategoryId)
      .map((venue) => ({
        sub_category_id: venue.subCategoryId,
        $or: venue.locationId
          ? [{ location: null }, { 'location.location_id': venue.locationId }]
          : [{ location: null }],
      }));
    if (perVenue.length === 0) return null;
    return {
      ...PRE_LIVE_FILTER,
      ...PHYSICAL_FILTER,
      ...ACTIVE_FILTER,
      venue_claim: null,
      created_at: { $gt: venueCutoff },
      ...andOf({ $or: perVenue }, locationScope(scope?.location_id)),
    };
  },

  /**
   * Pre-live offers with no host yet in the sub-categories this host works in,
   * optionally narrowed to ONE of those. A sub-category the host is not approved
   * in narrows to nothing rather than to someone else's offers. A host has no
   * city of their own, so only the page's selection narrows the city.
   */
  hostOpenFilter(subIds: Types.ObjectId[], scope?: AutoPodQueueScope) {
    const wanted = scope?.sub_category_id
      ? subIds.filter((id) => String(id) === String(scope.sub_category_id))
      : subIds;
    if (wanted.length === 0) return null;
    return {
      ...PRE_LIVE_FILTER,
      ...ACTIVE_FILTER,
      host_claim: null,
      sub_category_id: { $in: wanted },
      ...locationScope(scope?.location_id),
    };
  },

  /**
   * Pre-live offers with no club yet that one of these clubs could claim: the
   * offer's category must be THAT club's, and its city (once pinned) that club's
   * too — a pair per club, never the union of everyone's categories against
   * everyone's cities.
   */
  clubOpenFilter(clubs: AdminClub[], scope?: AutoPodQueueScope) {
    const perClub = clubs
      .filter((club) => club.categoryId)
      .map((club) => ({
        sub_category_id: club.categoryId,
        $or: club.locationId
          ? [{ location: null }, { 'location.location_id': club.locationId }]
          : [{ location: null }],
      }));
    if (perClub.length === 0) return null;
    return {
      ...PRE_LIVE_FILTER,
      ...ACTIVE_FILTER,
      club_claim: null,
      ...andOf({ $or: perClub }, locationScope(scope?.location_id)),
    };
  },

  /**
   * Offers one of this owner's venues may still accept, plus every offer they
   * accepted (whatever became of it). Scope is computed from ownership here, so
   * a caller who owns no venue sees nothing at all.
   */
  async listForVenue(userId: string, scope?: AutoPodQueueScope) {
    const owned = await this.ownerVenues(userId);
    const venues = scope?.venue_id
      ? owned.filter((venue) => String(venue.id) === scope.venue_id)
      : owned;
    if (venues.length === 0) return [];
    const { venueCutoff, venueExpiryHours } = await this.windows();
    const or: any[] = [{ 'venue_claim.owner_user_id': new Types.ObjectId(userId) }];
    const open = this.venueOpenFilter(venues, venueCutoff, scope);
    if (open) or.push(open);
    const docs = await AutoPodModel.find({ $or: or }).sort({ created_at: -1 }).limit(200);
    // The venue's list is the one place the countdown is shown, so it is the
    // one payload that carries it.
    return docs.map((doc) => ({
      ...autoPodToPub(doc),
      venue_expires_at: venueExpiresAt(doc, venueExpiryHours),
    }));
  },

  /** Offers still needing a host in a sub-category this host works in, plus the
   * ones they already assigned themselves to. */
  async listForHost(userId: string, scope?: AutoPodQueueScope) {
    const subIds = await this.hostSubCategoryIds(userId);
    const or: any[] = [{ 'host_claim.user_id': new Types.ObjectId(userId) }];
    const open = this.hostOpenFilter(subIds, scope);
    if (open) or.push(open);
    const docs = await AutoPodModel.find({ $or: or }).sort({ created_at: -1 }).limit(200);
    return docs.map(autoPodToPub);
  },

  /** Offers a club of theirs could still claim, plus their clubs' claims. */
  async listForClubAdmin(userId: string, scope?: AutoPodQueueScope) {
    const clubs = await this.adminClubs(userId);
    if (clubs.length === 0) return [];
    const or: any[] = [{ 'club_claim.club_id': { $in: clubs.map((c) => c.id) } }];
    const open = this.clubOpenFilter(clubs, scope);
    if (open) or.push(open);
    const docs = await AutoPodModel.find({ $or: or }).sort({ created_at: -1 }).limit(200);
    return docs.map(autoPodToPub);
  },

  /**
   * May this partner read this one Auto Pod? Yes when they (or a club of
   * theirs) enrolled in it, or when it is still open to them — checked against
   * the same filters the queues use, on this single row, so it never depends on
   * how long their queue is.
   */
  async canRead(userId: string, autoPodId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(autoPodId) || !Types.ObjectId.isValid(userId)) return false;
    const doc = await AutoPodModel.findById(autoPodId);
    if (!doc) return false;
    if (doc.venue_claim && String(doc.venue_claim.owner_user_id) === userId) return true;
    if (doc.host_claim && String(doc.host_claim.user_id) === userId) return true;
    if (doc.club_claim) {
      if (String(doc.club_claim.user_id) === userId) return true;
      const admin = await ClubModel.exists({
        _id: doc.club_claim.club_id,
        admin_user_ids: new Types.ObjectId(userId),
      });
      if (admin) return true;
    }
    const [venues, subIds, clubs, { venueCutoff }] = await Promise.all([
      this.ownerVenues(userId),
      this.hostSubCategoryIds(userId),
      this.adminClubs(userId),
      this.windows(),
    ]);
    const open = [
      this.venueOpenFilter(venues, venueCutoff),
      this.hostOpenFilter(subIds),
      this.clubOpenFilter(clubs),
    ].filter(Boolean) as Record<string, unknown>[];
    for (const filter of open) {
      if (await AutoPodModel.exists({ _id: doc._id, ...filter })) return true;
    }
    return false;
  },

  /**
   * How many Auto Pods are waiting on this user in each role — ONE round trip,
   * because the studio-mode switch reads all three at once to decide where to
   * land and must never wait on three requests. Scoped exactly as the queues
   * are, so the switch never lands someone on offers they cannot take.
   */
  async actionCounts(userId: string) {
    const [venues, subIds, clubs, { venueCutoff }] = await Promise.all([
      this.ownerVenues(userId),
      this.hostSubCategoryIds(userId),
      this.adminClubs(userId),
      this.windows(),
    ]);
    const venueOpen = this.venueOpenFilter(venues, venueCutoff);
    const hostOpen = this.hostOpenFilter(subIds);
    const clubOpen = this.clubOpenFilter(clubs);
    const [venue, host, club] = await Promise.all([
      venueOpen ? AutoPodModel.countDocuments(venueOpen) : 0,
      hostOpen ? AutoPodModel.countDocuments(hostOpen) : 0,
      clubOpen ? AutoPodModel.countDocuments(clubOpen) : 0,
    ]);
    return { venue, host, club };
  },

  /** Projected earnings for the CALLING host, so a host sees what assigning
   * themselves is worth before they commit. Null until a venue has priced a
   * physical offer; a virtual one has no venue cost, so it is known at once. */
  async expectedHostEarnings(doc: IAutoPod, userId: string | null) {
    if (!userId) return null;
    if (doc.pod_mode !== 'VIRTUAL' && !doc.venue_claim) return null;
    try {
      const projection = await breakdownService.potentialPodEarnings(
        userId,
        doc.pod_amount ?? 0,
        doc.no_of_spots ?? 0,
        doc.venue_claim ? String(doc.venue_claim.venue_id) : null,
        doc.venue_claim?.slot_price ?? 0
      );
      return projection.waterfall.host_receives;
    } catch {
      // A non-viable combination is not an error to READ — the claim itself
      // reports it. The card just shows no figure.
      return null;
    }
  },

  /** The materialized pod, for the "view pod" link on a LIVE row. */
  async materializedPod(doc: IAutoPod) {
    if (!doc.pod_id) return null;
    const { mapPodToPublic, loadPodClubSlugMap } = await import('@modules/pods/pod/pod.service');
    const pod = await PodModel.findById(doc.pod_id);
    if (!pod) return null;
    const slugMap = await loadPodClubSlugMap([pod]);
    return mapPodToPublic(pod, slugMap);
  },
};
