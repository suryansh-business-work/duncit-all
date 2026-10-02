/**
 * `podService` — pod reads: the discovery list, joined/hosted lists, the admin,
 * mine and club-admin tables, and single-pod lookups. Composed into
 * `podService` in pod.service.ts.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { podLifecycleFilter, type PodLifecycle } from './pod.lifecycle';
import { podRowStatusFilter, type PodRowStatus } from './pod.rowStatus';
import { PodModel } from './pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import {
  escapedSearchRegex,
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';
import { LEGACY_POD_TYPE_MAP } from './pod-type.migration';
import { logs } from '@observability/log';
import { loadClubSlugMap, toPub } from './pod.shared';
import { buildPodPlaceFilter } from './pod.venue';

/**
 * Ceiling on the unpaginated `pods` read.
 *
 * `pods` has no page argument — the discovery surfaces take the whole set and
 * filter it client-side — so without a ceiling the query grew with the
 * collection forever. The number is far above any city's live pod count and
 * exists to bound the worst case, not to page: hitting it is logged as a
 * warning precisely because it means the feed has outgrown this shape.
 * Env-tunable so a spike can be absorbed without a deploy.
 */
const POD_LIST_MAX = Number(process.env.POD_LIST_MAX_ROWS) || 1000;

/** Shared allowlists for the table engine (podsTable / myHostPodsTable —
 * DUNCIT TABLE CONTRACT v1). Only defaultSort could differ; both lists sort by
 * pod_date_time desc today (mirrors list() / listMyHostPods()). */
const POD_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['pod_title', 'pod_id'],
  sortFields: {
    pod_title: 'pod_title',
    pod_date_time: 'pod_date_time',
    pod_amount: 'pod_amount',
    pod_hits: 'pod_hits',
    no_of_spots: 'no_of_spots',
    is_active: 'is_active',
    completed_at: 'completed_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
    club_id: 'club_id',
    pod_mode: 'pod_mode',
    pod_type: 'pod_type',
    venue_approval_status: 'venue_approval_status',
    // Admin > Pods: the cover thumbnail and the products summary.
    cover: 'pod_images_and_videos.url',
    products: 'product_requests.product_name',
  },
  filterFields: {
    pod_title: { type: 'string' },
    cover: { path: 'pod_images_and_videos.url', type: 'string' },
    products: { path: 'product_requests.product_name', type: 'string' },
    no_of_spots: { type: 'number' },
    pod_hits: { type: 'number' },
    club_id: { type: 'string' },
    venue_id: { type: 'string' },
    location_id: { type: 'string' },
    zone_name: { type: 'string' },
    host_user_id: { path: 'pod_hosts_id', type: 'string' },
    pod_mode: { type: 'enum' },
    pod_type: { type: 'enum' },
    pod_occurrence: { type: 'enum' },
    venue_approval_status: { type: 'enum' },
    is_active: { type: 'boolean' },
    products_enabled: { type: 'boolean' },
    pod_amount: { type: 'number' },
    pod_date_time: { type: 'date' },
    completed_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { pod_date_time: -1 },
};

/** Table filter values are string-typed, and released app binaries in the
 * field may still send the legacy pod_type values — coerce them to FREE/PAID
 * at the boundary so their filters keep matching instead of returning nothing. */
function coerceLegacyPodTypeFilters(input?: TableQueryInput | null): TableQueryInput | null | undefined {
  if (!input?.filters?.length) return input;
  const filters = input.filters.map((f) => {
    if (f.field !== 'pod_type') return f;
    return {
      ...f,
      value: f.value == null ? f.value : LEGACY_POD_TYPE_MAP[f.value] ?? f.value,
      values: f.values == null ? f.values : f.values.map((v) => LEGACY_POD_TYPE_MAP[v] ?? v),
    };
  });
  return { ...input, filters };
}

function buildPodDateRange(range?: { from?: string | null; to?: string | null }) {
  const dateRange: any = {};
  if (range?.from) {
    const from = new Date(range.from);
    if (Number.isNaN(from.getTime())) throw new GraphQLError('Invalid from date', { extensions: { code: 'BAD_USER_INPUT' } });
    dateRange.$gte = from;
  }
  if (range?.to) {
    const to = new Date(range.to);
    if (Number.isNaN(to.getTime())) throw new GraphQLError('Invalid to date', { extensions: { code: 'BAD_USER_INPUT' } });
    dateRange.$lte = to;
  }
  return Object.keys(dateRange).length > 0 ? dateRange : null;
}

export const podListingMethods = {
  async list(
    filter?: {
      club_id?: string;
      venue_id?: string;
      location_id?: string;
      zone_name?: string;
      search?: string;
      is_active?: boolean;
      host_user_id?: string;
      has_reel?: boolean;
    },
    opts?: {
      includePendingApproval?: boolean;
      /** Runs over the raw rows alongside the club-slug read — a caller's
       * per-page prime reads other collections off the same rows, so the two
       * go out together rather than one round trip after the other. */
      prime?: (docs: readonly any[]) => Promise<unknown>;
    }
  ) {
    const q: any = {};
    if (filter?.club_id) q.club_id = filter.club_id;
    if (filter?.venue_id) q.venue_id = filter.venue_id;
    const placeFilter = await buildPodPlaceFilter(filter);
    if (placeFilter) Object.assign(q, placeFilter);
    if (filter?.is_active !== undefined) q.is_active = filter.is_active;
    // Explore reels: only pods that actually uploaded a reel video.
    if (filter?.has_reel) q.reel_url = { $nin: [null, ''] };
    // ESCAPED: the raw string used to be compiled as a pattern, so a search of
    // ".*" listed every pod and a crafted one could pin the event loop.
    if (filter?.search) q.pod_title = escapedSearchRegex(filter.search);
    if (filter?.host_user_id) q.pod_hosts_id = filter.host_user_id;
    // A pod awaiting the venue owner's slot approval is NOT live. Hide it from
    // every non-review caller so it can never surface in discovery (or via an
    // unfiltered public read) until the owner approves — a server guarantee, not
    // just a client `is_active` filter. Admin/onboarding reviewers opt in.
    if (!opts?.includePendingApproval) q.venue_approval_status = { $ne: 'PENDING' };
    // Bounded and lean. Unbounded, this hydrated every matching pod into a full
    // Mongoose document, so the discovery feed grew with the collection until it
    // outran the client's request timeout. The sort is date-DESCENDING, so the
    // cap sheds the OLDEST pods first — the ones every discovery surface already
    // filters out as past — and never the upcoming ones the feed is built from.
    const docs = await PodModel.find(q)
      .sort({ pod_date_time: -1 })
      .limit(POD_LIST_MAX)
      .lean();
    if (docs.length === POD_LIST_MAX) {
      // Silent truncation would read as "that is all the pods there are". Say so
      // instead: this is the signal that the cap needs raising or the feed needs
      // paginating, and it lands in the Tech portal's logs where it is visible.
      logs.server.warn('pod', 'list', {
        message: `Pod list hit its ${POD_LIST_MAX}-row cap; older pods were not returned.`,
        filter: JSON.stringify(filter ?? {}),
      });
    }
    const [slugMap] = await Promise.all([loadClubSlugMap(docs), opts?.prime?.(docs)]);
    return docs.map((d) => toPub(d, slugMap));
  },

  /**
   * The live pods a user holds a JOINED membership on, newest first.
   *
   * Reads the memberships rather than `pod_attendees`: a booking is the record
   * of joining, and the array on the pod is an audience list that backouts and
   * spot-fills rewrite. Drafts, declined pods and pods still awaiting a venue
   * are not something to show on a profile, so the same visibility the public
   * feed applies holds here; soft-deleted pods drop out through the model hook.
   */
  async listJoinedBy(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return [];
    const memberships = await PodMemberModel.find({
      user_id: new Types.ObjectId(userId),
      status: 'JOINED',
    })
      .select('pod_id')
      .sort({ joined_at: -1 })
      .limit(POD_LIST_MAX)
      .lean();
    if (memberships.length === 0) return [];
    const docs = await PodModel.find({
      _id: { $in: memberships.map((m) => m.pod_id) },
      is_active: true,
      venue_approval_status: { $ne: 'PENDING' },
    })
      .sort({ pod_date_time: -1 })
      .lean();
    const slugMap = await loadClubSlugMap(docs);
    return docs.map((d) => toPub(d, slugMap));
  },

  /** Server-side table page (search/filter/sort/paginate) for the podsTable
   * query — same rows as list(). The venue-approval guard lives in the
   * baseFilter, so a client filter can never surface a PENDING pod to a
   * non-review caller (runTableQuery $and-merges the two). Soft-deleted pods
   * stay excluded via the model's pre-find hook. */
  async table(
    input?: TableQueryInput | null,
    opts?: {
      includePendingApproval?: boolean;
      includeDeleted?: boolean;
      /** Narrows the page to one derived bucket (Admin > Pods > All Pods). */
      lifecycle?: PodLifecycle | null;
    }
  ) {
    // CANCELLED reads soft-deleted rows. The model's pre-find hook normally
    // re-pins `deleted_at: null` for callers without the includeDeleted opt-in
    // — but it stands down the moment a filter mentions `deleted_at`, which
    // this one does. So the guarantee is restored here rather than leaned on: a
    // caller who may not see cancelled pods sees none, not all of them.
    if (opts?.lifecycle === 'CANCELLED' && !opts.includeDeleted) {
      return { rows: [], total: 0, page: 1, page_size: 0 };
    }
    const baseFilter: Record<string, unknown> = opts?.includePendingApproval
      ? {}
      : { venue_approval_status: { $ne: 'PENDING' } };
    // Derived from dates rather than stored, so it cannot ride the engine's
    // field allowlist — it joins the approval guard in the baseFilter instead,
    // where a client filter can never widen it.
    if (opts?.lifecycle) {
      Object.assign(baseFilter, podLifecycleFilter(opts.lifecycle, new Date()));
    }
    const { docs, total, page, page_size } = await runTableQuery<any>(
      PodModel,
      baseFilter,
      coerceLegacyPodTypeFilters(input),
      POD_TABLE_CONFIG,
      { includeDeleted: opts?.includeDeleted }
    );
    const slugMap = await loadClubSlugMap(docs);
    return { rows: docs.map((d) => toPub(d, slugMap)), total, page, page_size };
  },

  /** Host-scoped table page for myHostPodsTable. The baseFilter pins
   * pod_hosts_id to the caller ($and-merged by runTableQuery), so client
   * filters can never widen the scope to another host's pods. Like
   * listMyHostPods, the host still sees their own PENDING-approval pods. */
  async tableMine(userId: string, input?: TableQueryInput | null) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    const { docs, total, page, page_size } = await runTableQuery<any>(
      PodModel,
      { pod_hosts_id: new Types.ObjectId(userId) },
      coerceLegacyPodTypeFilters(input),
      POD_TABLE_CONFIG
    );
    const slugMap = await loadClubSlugMap(docs);
    return { rows: docs.map((d) => toPub(d, slugMap)), total, page, page_size };
  },

  /**
   * Club-scoped table page for the Partners portal's Club Admin. The club ids
   * are pinned in the baseFilter ($and-merged by runTableQuery), so a client
   * filter can never widen it to another club's pods. Unlike the public table
   * this deliberately shows EVERY stage — pods still awaiting the venue
   * owner's approval and cancelled (soft-deleted) ones included — because a
   * club admin must be able to open and edit a pod wherever it sits in the
   * booking cycle.
   */
  async tableForClubAdmin(
    clubIds: string[],
    input?: TableQueryInput | null,
    status?: PodRowStatus | null
  ) {
    if (clubIds.length === 0) return { rows: [], total: 0, page: 1, page_size: 0 };
    const baseFilter: Record<string, unknown> = {
      club_id: { $in: clubIds.map((id) => new Types.ObjectId(id)) },
    };
    // Derived from four fields, so it cannot ride the engine's allowlist — it
    // joins the club scope in the baseFilter, which a client filter can never
    // widen (runTableQuery $and-merges the two).
    if (status) Object.assign(baseFilter, podRowStatusFilter(status));
    const { docs, total, page, page_size } = await runTableQuery<any>(
      PodModel,
      baseFilter,
      coerceLegacyPodTypeFilters(input),
      POD_TABLE_CONFIG,
      { includeDeleted: true }
    );
    const slugMap = await loadClubSlugMap(docs);
    return { rows: docs.map((d) => toPub(d, slugMap)), total, page, page_size };
  },

  async activeLocationIds(): Promise<string[]> {
    // Locations that currently host at least one live pod (active and not past).
    const ids = await PodModel.distinct('location_id', {
      is_active: true,
      location_id: { $ne: null },
      pod_date_time: { $gte: new Date() },
    });
    return ids.map(String);
  },

  async listMyHostPods(userId: string, range?: { from?: string | null; to?: string | null }) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    const q: any = { pod_hosts_id: new Types.ObjectId(userId) };
    const dateRange = buildPodDateRange(range);
    if (dateRange) q.pod_date_time = dateRange;
    const docs = await PodModel.find(q).sort({ pod_date_time: -1 }).limit(200);
    const slugMap = await loadClubSlugMap(docs);
    return docs.map((d) => toPub(d, slugMap));
  },

  async getById(id: string, opts?: { includeDeleted?: boolean }) {
    // Pod History resolves a booking's pod even after it was soft-deleted; every
    // other caller gets the default (deleted pods excluded by the schema hook).
    const query = PodModel.findById(id);
    if (opts?.includeDeleted) query.setOptions({ includeDeleted: true });
    const doc = await query;
    if (!doc) return null;
    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  async getBySlugs(clubSlug: string, podSlug: string) {
    const club = await ClubModel.findOne({ club_id: clubSlug });
    if (!club) return null;
    const doc = await PodModel.findOne({ club_id: club._id, pod_id: podSlug });
    if (!doc) return null;
    const slugMap = new Map([[String(club._id), club.club_id]]);
    return toPub(doc, slugMap);
  },
};
