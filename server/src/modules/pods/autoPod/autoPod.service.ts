import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { AutoPodModel, type IAutoPod } from './autoPod.model';
import { autoPodNotify } from './autoPod.notify';
import { CategoryModel } from '@modules/pods/category/category.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { validateHasImage } from '@modules/pods/pod/pod.service';
import { breakdownService } from '@modules/finance/finance/breakdown.service';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { logs } from '@observability/log';

export function autoPodFail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

/** Stages an Auto Pod can still be acted on or pulled from. */
export const PRE_LIVE_STAGES = ['OPEN', 'CLAIMING'] as const;

export const autoPodToPub = (d: IAutoPod | null) => {
  if (!d) return null;
  const venue = d.venue_claim;
  const host = d.host_claim;
  const club = d.club_claim;
  return {
    id: String(d._id),
    auto_pod_no: d.auto_pod_no,
    stage: d.stage,
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
  searchFields: ['pod_title', 'auto_pod_no'],
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
    sub_category_id: { type: 'string' },
    super_category_id: { type: 'string' },
    pod_amount: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** An event row for the Auto Pod's own trail (PodAuditLog needs a real pod). */
export function autoPodEvent(
  action: string,
  actorUserId?: string | null,
  actorName = '',
  note = ''
) {
  return {
    action,
    actor_user_id: actorUserId ? new Types.ObjectId(actorUserId) : null,
    actor_name: actorName,
    note,
    at: new Date(),
  };
}

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
  if (!sub || sub.level !== 'SUB') {
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

/** The admin's template must be viable BEFORE any partner commits to it. */
async function validateTemplate(input: any, minPax: number) {
  const title = String(input.pod_title ?? '').trim();
  if (title.length < 3) autoPodFail('BAD_USER_INPUT', 'Title is too short');
  if (!String(input.pod_description ?? '').trim()) {
    autoPodFail('BAD_USER_INPUT', 'Description is required');
  }
  validateHasImage(input.pod_images_and_videos);
  const amount = Number(input.pod_amount) || 0;
  // Auto Pods are physical, and a physical pod may never be free — so unlike an
  // ordinary pod the floor here is 1, not 0.
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
  // Sanity only: no host and no venue exist yet, so this runs on default rates
  // and catches a price that could never pay anyone.
  await breakdownService.assertViablePodEconomics({
    hostUserId: null,
    podAmount: amount,
    noOfSpots: spots,
    venueId: null,
    venueAmount: 0,
  });
}

const TEMPLATE_FIELDS = [
  'pod_title',
  'pod_description',
  'pod_info',
  'pod_hashtag',
  'pod_images_and_videos',
  'reel_url',
  'pod_amount',
  'no_of_spots',
  'pod_occurrence',
  'what_this_pod_offers',
  'available_perks',
  'payment_terms',
  'place_charges',
] as const;

export const autoPodService = {
  async create(actorUserId: string, input: any) {
    const { superCategoryId, minPax } = await resolveCategoryPair(input.sub_category_id);
    await validateTemplate(input, minPax);

    const doc = await AutoPodModel.create({
      stage: 'OPEN',
      created_by: new Types.ObjectId(actorUserId),
      pod_title: String(input.pod_title).trim(),
      pod_description: input.pod_description,
      pod_info: input.pod_info ?? '',
      pod_hashtag: input.pod_hashtag ?? [],
      pod_images_and_videos: input.pod_images_and_videos ?? [],
      reel_url: input.reel_url ?? null,
      super_category_id: new Types.ObjectId(superCategoryId),
      sub_category_id: new Types.ObjectId(input.sub_category_id),
      pod_type: 'PAID',
      pod_amount: input.pod_amount,
      no_of_spots: input.no_of_spots,
      pod_occurrence: input.pod_occurrence ?? 'ONE_TIME',
      what_this_pod_offers: input.what_this_pod_offers ?? [],
      available_perks: input.available_perks ?? [],
      payment_terms: input.payment_terms ?? null,
      place_charges: input.place_charges ?? [],
      events: [autoPodEvent('CREATE', actorUserId, '', 'Auto Pod opened for venues')],
    });

    autoPodNotify.opened(doc).catch((error) =>
      logs.server.error('autoPod', 'notifyOpened', { error, auto_pod_id: String(doc._id) })
    );
    return autoPodToPub(doc);
  },

  /**
   * Edits are OPEN-only. Once a venue has accepted, it committed a priced slot
   * against this exact economics picture — moving the price or the spot count
   * underneath it would invalidate the coverage check it passed. The admin
   * cancels and re-creates instead.
   */
  async update(actorUserId: string, autoPodId: string, input: any) {
    const doc = await this.loadById(autoPodId);
    if (doc.stage !== 'OPEN') {
      autoPodFail(
        'BAD_REQUEST',
        'A venue has already accepted this Auto Pod — cancel it instead of editing it'
      );
    }
    const subCategoryId = input.sub_category_id ?? String(doc.sub_category_id);
    const { superCategoryId, minPax } = await resolveCategoryPair(subCategoryId);
    const merged: any = { ...autoPodToPub(doc), ...input };
    await validateTemplate(merged, minPax);

    for (const field of TEMPLATE_FIELDS) {
      if (input[field] !== undefined) (doc as any)[field] = input[field];
    }
    doc.super_category_id = new Types.ObjectId(superCategoryId);
    doc.sub_category_id = new Types.ObjectId(subCategoryId);
    doc.events.push(autoPodEvent('UPDATE', actorUserId) as any);
    await doc.save();
    return autoPodToPub(doc);
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
      { _id: doc._id, stage: { $in: PRE_LIVE_STAGES } },
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
      autoPodFail(
        'CONFLICT',
        'This Auto Pod is already live — cancel the pod itself instead'
      );
    }
    await venueSlotService.releaseForAutoPod(String(doc._id));
    autoPodNotify.cancelled(cancelled!).catch((error) =>
      logs.server.error('autoPod', 'notifyCancelled', { error, auto_pod_id: autoPodId })
    );
    return autoPodToPub(cancelled);
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

  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<any>(
      AutoPodModel,
      {},
      input,
      AUTO_POD_TABLE_CONFIG
    );
    return { rows: docs.map(autoPodToPub), total, page, page_size };
  },

  /** True when this user owns at least one approved, active venue. */
  async ownsApprovedVenue(userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) return false;
    return !!(await VenueModel.exists({
      owner_user_id: new Types.ObjectId(userId),
      status: 'APPROVED',
      is_active: true,
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

  /** The caller's clubs, with the sub-category each one carries. */
  async adminClubs(userId: string): Promise<{ id: Types.ObjectId; categoryId: Types.ObjectId | null }[]> {
    if (!Types.ObjectId.isValid(userId)) return [];
    const clubs = await ClubModel.find({
      admin_user_ids: new Types.ObjectId(userId),
      is_active: true,
    })
      .select('category_id')
      .lean();
    return (clubs as any[]).map((c) => ({ id: c._id, categoryId: c.category_id ?? null }));
  },

  /**
   * Open offers any approved venue may accept, plus the ones this owner already
   * accepted and is still waiting on. Scope is computed from ownership here, so
   * a caller who owns no venue sees nothing at all.
   */
  async listForVenue(userId: string) {
    if (!(await this.ownsApprovedVenue(userId))) return [];
    const docs = await AutoPodModel.find({
      $or: [
        { stage: 'OPEN' },
        {
          'venue_claim.owner_user_id': new Types.ObjectId(userId),
          stage: { $in: ['CLAIMING', 'MATERIALIZING', 'LIVE'] },
        },
      ],
    })
      .sort({ created_at: -1 })
      .limit(200);
    return docs.map(autoPodToPub);
  },

  /** Venue-accepted offers still needing a host in a sub-category this host
   * works in, plus the ones they already assigned themselves to. */
  async listForHost(userId: string) {
    const subIds = await this.hostSubCategoryIds(userId);
    const or: any[] = [{ 'host_claim.user_id': new Types.ObjectId(userId) }];
    if (subIds.length > 0) {
      or.push({ stage: 'CLAIMING', host_claim: null, sub_category_id: { $in: subIds } });
    }
    const docs = await AutoPodModel.find({ $or: or }).sort({ created_at: -1 }).limit(200);
    return docs.map(autoPodToPub);
  },

  /** Venue-accepted offers a club of theirs could claim (category must match,
   * because the pod inherits its category from the club), plus their claims. */
  async listForClubAdmin(userId: string) {
    const clubs = await this.adminClubs(userId);
    if (clubs.length === 0) return [];
    const categoryIds = clubs.map((c) => c.categoryId).filter(Boolean) as Types.ObjectId[];
    const or: any[] = [{ 'club_claim.club_id': { $in: clubs.map((c) => c.id) } }];
    if (categoryIds.length > 0) {
      or.push({ stage: 'CLAIMING', club_claim: null, sub_category_id: { $in: categoryIds } });
    }
    const docs = await AutoPodModel.find({ $or: or }).sort({ created_at: -1 }).limit(200);
    return docs.map(autoPodToPub);
  },

  /**
   * How many Auto Pods are waiting on this user in each role — ONE round trip,
   * because the studio-mode switch reads all three at once to decide where to
   * land and must never wait on three requests.
   */
  async actionCounts(userId: string) {
    const [venueOwner, subIds, clubs] = await Promise.all([
      this.ownsApprovedVenue(userId),
      this.hostSubCategoryIds(userId),
      this.adminClubs(userId),
    ]);
    const clubCategoryIds = clubs.map((c) => c.categoryId).filter(Boolean) as Types.ObjectId[];
    const [venue, host, club] = await Promise.all([
      venueOwner ? AutoPodModel.countDocuments({ stage: 'OPEN' }) : 0,
      subIds.length > 0
        ? AutoPodModel.countDocuments({
            stage: 'CLAIMING',
            host_claim: null,
            sub_category_id: { $in: subIds },
          })
        : 0,
      clubCategoryIds.length > 0
        ? AutoPodModel.countDocuments({
            stage: 'CLAIMING',
            club_claim: null,
            sub_category_id: { $in: clubCategoryIds },
          })
        : 0,
    ]);
    return { venue, host, club };
  },

  /** Projected earnings for the CALLING host, so a host sees what assigning
   * themselves is worth before they commit. Null until a venue has priced it. */
  async expectedHostEarnings(doc: IAutoPod, userId: string | null) {
    if (!userId || !doc.venue_claim) return null;
    try {
      const projection = await breakdownService.potentialPodEarnings(
        userId,
        doc.pod_amount ?? 0,
        doc.no_of_spots ?? 0,
        String(doc.venue_claim.venue_id),
        doc.venue_claim.slot_price ?? 0
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
