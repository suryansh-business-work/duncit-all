import { GraphQLError } from 'graphql';
import { buildStudioPodSummary } from '@modules/pods/pod/studio-summary';
import { Types } from 'mongoose';
import { ClubModel } from '@modules/clubs/club/club.model';
import { mapClubToPublic, clubService } from '@modules/clubs/club/club.service';
import { CategoryModel } from '@modules/pods/category/category.model';
import { podService } from '@modules/pods/pod/pod.service';
import type { PodRowStatus } from '@modules/pods/pod/pod.rowStatus';
import { podAuditService } from '@modules/pods/podAudit/podAudit.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { ClubRatingModel } from '@modules/clubs/club/clubRating.model';
import { ClubFollowerModel } from '@modules/access/user/relations';
import { UserModel } from '@modules/access/user/user.model';
import { HostModel } from '@modules/venues/host/host.model';
import { venueService } from '@modules/venues/venue/venue.service';
import { LocationModel } from '@modules/platform/location/location.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import {
  applyTableQueryInMemory,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';
import { podSeatsTaken } from '@modules/pods/pod/pod.seats';
import { bucketForPod, type HostStatusCounts } from '@modules/finance/finance/breakdown.service';

type Actor = { id: string; roles?: string[] };

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

function forbidden(): never {
  throw new GraphQLError('You do not administer this club', {
    extensions: { code: 'FORBIDDEN' },
  });
}

function podNotFound(): never {
  throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

/** Inclusive month sequence [from..to], each `{ key: 'YYYY-MM', label: 'Mon' }`.
 * Capped at the LAST 36 months of the window: "All time" on a club that has
 * been running for years would otherwise draw its first three years and stop
 * short of the months the admin actually came to look at. */
function monthSequence(from: Date, to: Date) {
  const seq: Array<{ key: string; label: string }> = [];
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cur <= end) {
    seq.push({ key: monthKey(cur), label: MONTH_LABELS[cur.getUTCMonth()] });
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return seq.slice(-36);
}

type ClubTally = { upcoming: number; completed: number; total: number; revenue: number };

/**
 * The dashboard's date window. Either bound may be absent, and absent means
 * UNBOUNDED rather than "now" — that is what makes "All time" a real option and
 * what keeps the range presets honest: they all send a start and no end, so
 * "Last 30 days" still counts the pods scheduled ahead instead of reporting
 * zero upcoming for every range but one.
 */
type DashboardRange = { from: Date | null; to: Date | null; now: number };

/** Whether a moment falls inside the window (an absent bound never excludes). */
const inRange = (d: Date, r: DashboardRange) =>
  (!r.from || d >= r.from) && (!r.to || d <= r.to);

/** Mongo filter fragment scoping `field` to the window. Empty when both bounds
 * are absent, so spreading it into a filter simply leaves that filter open. */
function rangeFilter(field: string, from: Date | null, to: Date | null): Record<string, unknown> {
  const cond: Record<string, Date> = {};
  if (from) cond.$gte = from;
  if (to) cond.$lte = to;
  return Object.keys(cond).length > 0 ? { [field]: cond } : {};
}

/** Parses one ISO bound; null/empty means "no bound on this side". */
function parseBound(raw: string | null | undefined, side: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new GraphQLError(`Invalid dashboard ${side} date`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return d;
}

/** Fold one pod into its club's row (no-op when the pod's club is out of scope). */
function bumpClubRow(row: ClubTally | undefined, isUpcoming: boolean, isCompleted: boolean) {
  if (!row) return;
  row.total += 1;
  if (isUpcoming) row.upcoming += 1;
  if (isCompleted) row.completed += 1;
}

/** Per-club + overall pod tallies, computed in-memory (pod_date_time may be a
 * Date or an ISO string, so we normalise via `new Date` rather than aggregate).
 *
 * A pod belongs to the window by the date it RUNS on — the date the club admin
 * sees in the pods table — so every figure derived here (counts, capacity,
 * attendees, hosts) moves together when the range changes, and total stays
 * upcoming + completed. */
function tallyPods(pods: any[], byClub: Map<string, ClubTally>, range: DashboardRange) {
  let total_pods = 0;
  let upcoming_pods = 0;
  let completed_pods = 0;
  let total_spots = 0;
  let total_attendees = 0;
  const hostSet = new Set<string>();
  const podsSeries = new Map<string, number>();
  for (const p of pods) {
    const d = new Date(p.pod_date_time);
    if (!inRange(d, range)) continue;
    const t = +d;
    const isUpcoming = p.is_active && t >= range.now;
    const isCompleted = t < range.now;
    total_pods += 1;
    if (isUpcoming) upcoming_pods += 1;
    if (isCompleted) completed_pods += 1;
    total_spots += p.no_of_spots ?? 0;
    total_attendees += podSeatsTaken(p);
    (p.pod_hosts_id ?? []).forEach((h: any) => hostSet.add(String(h)));
    bumpClubRow(byClub.get(String(p.club_id)), isUpcoming, isCompleted);
    podsSeries.set(monthKey(d), (podsSeries.get(monthKey(d)) ?? 0) + 1);
  }
  return {
    total_pods,
    upcoming_pods,
    completed_pods,
    total_spots,
    total_attendees,
    hostSet,
    podsSeries,
  };
}

/** Revenue (overall + monthly), summed in-memory from the SUCCESS payments joined
 * back to their pod's club (per-club revenue lands on the `byClub` rows).
 *
 * Money belongs to the window by the date it was COLLECTED, not by the date of
 * the pod it paid for — so an early booking for a pod months out still counts
 * in the range that actually took the payment. The payment set is scoped to
 * every pod in the caller's clubs for the same reason: narrowing it to the
 * in-range pods as well would drop that payment twice over. */
function tallyRevenue(
  payments: any[],
  podToClub: Map<string, string>,
  byClub: Map<string, ClubTally>,
  range: DashboardRange
) {
  let total_revenue = 0;
  const revenueSeries = new Map<string, number>();
  for (const pay of payments) {
    const d = new Date(pay.created_at);
    if (!inRange(d, range)) continue;
    const amount = pay.total ?? 0;
    total_revenue += amount;
    const clubId = podToClub.get(String(pay.pod_id));
    const row = clubId ? byClub.get(clubId) : undefined;
    if (row) row.revenue += amount;
    revenueSeries.set(monthKey(d), (revenueSeries.get(monthKey(d)) ?? 0) + amount);
  }
  return { total_revenue, revenueSeries };
}

/** Start of the trend series when the window has no lower bound ("All time"):
 * the first month the clubs saw any activity, never later than this month — a
 * club whose only pods are still ahead would otherwise get an empty series. */
function earliestActivity(pods: any[], payments: any[], now: number): Date {
  let earliest = now;
  for (const p of pods) earliest = Math.min(earliest, +new Date(p.pod_date_time));
  for (const pay of payments) earliest = Math.min(earliest, +new Date(pay.created_at));
  return new Date(earliest);
}

/** Allowlists for the shared table engine over the COMPUTED per-club dashboard
 * rows (clubAdminDashboardTable — DUNCIT TABLE CONTRACT v1). Rows are built in
 * memory by dashboard(), so field keys map to themselves. */
const CLUB_ADMIN_CLUB_ROW_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['club_name', 'club_slug'],
  sortFields: {
    club_name: 'club_name',
    total_pods: 'total_pods',
    upcoming_pods: 'upcoming_pods',
    completed_pods: 'completed_pods',
    followers: 'followers',
    rating: 'rating',
    revenue: 'revenue',
  },
  filterFields: {
    club_name: { type: 'string' },
    total_pods: { type: 'number' },
    upcoming_pods: { type: 'number' },
    completed_pods: { type: 'number' },
    followers: { type: 'number' },
    rating: { type: 'number' },
    revenue: { type: 'number' },
  },
  defaultSort: { club_name: 1 },
};

/** Allowlists for the shared table engine over the COMPUTED max-info club rows
 * (myAdminClubsTable — DUNCIT TABLE CONTRACT v1). Rows are built in memory by
 * buildClubInfoRows(), so field keys map to themselves. */
const MY_ADMIN_CLUBS_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['club_name', 'slug'],
  sortFields: {
    club_name: 'club_name',
    super_category: 'super_category',
    category: 'category',
    locality: 'locality',
    location_label: 'location_label',
    followers_count: 'followers_count',
    total_pods: 'total_pods',
    upcoming_pods: 'upcoming_pods',
    matched_venues_count: 'matched_venues_count',
    is_verified: 'is_verified',
    is_active: 'is_active',
    created_at: 'created_at',
  },
  filterFields: {
    club_name: { type: 'string' },
    super_category: { type: 'string' },
    category: { type: 'string' },
    locality: { type: 'string' },
    followers_count: { type: 'number' },
    total_pods: { type: 'number' },
    upcoming_pods: { type: 'number' },
    matched_venues_count: { type: 'number' },
    is_verified: { type: 'boolean' },
    is_active: { type: 'boolean' },
    created_at: { type: 'date' },
  },
  defaultSort: { club_name: 1 },
};

const firstImageUrl = (media: Array<{ url?: string; type?: string }> = []) =>
  media.find((m) => m.type === 'IMAGE')?.url ?? media[0]?.url ?? null;

const nameOf = (names: Map<string, string>, id: unknown) => {
  if (!id) return null;
  const key = id as string;
  return names.get(String(key)) ?? null;
};

/** Per-club total/upcoming pod tallies (non-deleted pods; upcoming = active and
 * dated now or later, matching the dashboard's definition). */
function tallyClubPods(pods: any[]) {
  const now = Date.now();
  const tallies = new Map<string, { total: number; upcoming: number }>();
  for (const p of pods) {
    const key = String(p.club_id);
    const t = tallies.get(key) ?? { total: 0, upcoming: 0 };
    t.total += 1;
    if (p.is_active && +new Date(p.pod_date_time) >= now) t.upcoming += 1;
    tallies.set(key, t);
  }
  return tallies;
}

/** Batch lookups + row assembly for the max-info "Your Clubs" table. Category /
 * location names resolve in one query each; venue counts reuse the single
 * source of truth for the club↔venue auto-match. */
async function buildClubInfoRows(clubs: any[]) {
  if (clubs.length === 0) return [];
  const clubOids = clubs.map((c) => c._id);
  const categoryIds = clubs.flatMap((c) => [c.category_id, c.super_category_id]).filter(Boolean);
  const locationIds = clubs.map((c) => c.location_id).filter(Boolean);
  const [categories, locations, pods, followerRows, venueCounts] = await Promise.all([
    CategoryModel.find({ _id: { $in: categoryIds } }).select('name').lean(),
    LocationModel.find({ _id: { $in: locationIds } }).select('location_name city').lean(),
    PodModel.find({ club_id: { $in: clubOids }, deleted_at: null })
      .select('club_id pod_date_time is_active')
      .lean(),
    ClubFollowerModel.aggregate([
      { $match: { club_id: { $in: clubOids } } },
      { $group: { _id: '$club_id', count: { $sum: 1 } } },
    ]),
    Promise.all(
      clubs.map((c) =>
        venueService.countMatchingForClub({
          location_id: c.location_id ? String(c.location_id) : null,
          locality: c.locality ?? null,
          super_category_id: c.super_category_id ? String(c.super_category_id) : null,
          category_id: c.category_id ? String(c.category_id) : null,
        })
      )
    ),
  ]);
  const categoryNames = new Map<string, string>(
    (categories as any[]).map((c) => [String(c._id), c.name])
  );
  const locationLabels = new Map<string, string>(
    (locations as any[]).map((l) => [String(l._id), l.city || l.location_name])
  );
  const followersByClub = new Map<string, number>(
    (followerRows as any[]).map((r) => [String(r._id), r.count])
  );
  const podTallies = tallyClubPods(pods as any[]);
  return clubs.map((c, i) => {
    const tally = podTallies.get(String(c._id));
    return {
      id: String(c._id),
      club_name: c.club_name,
      slug: c.club_id,
      cover_image_url: firstImageUrl(c.club_feature_images_and_videos),
      super_category: nameOf(categoryNames, c.super_category_id),
      category: nameOf(categoryNames, c.category_id),
      locality: c.locality ?? '',
      location_label: nameOf(locationLabels, c.location_id),
      followers_count: followersByClub.get(String(c._id)) ?? 0,
      total_pods: tally?.total ?? 0,
      upcoming_pods: tally?.upcoming ?? 0,
      matched_venues_count: venueCounts[i] ?? 0,
      is_verified: !!c.is_verified,
      is_active: !!c.is_active,
      created_at: c.created_at?.toISOString?.() ?? '',
    };
  });
}

const EMPTY_KPIS = {
  assigned_clubs: 0,
  total_pods: 0,
  upcoming_pods: 0,
  completed_pods: 0,
  total_bookings: 0,
  backed_out: 0,
  total_attendees: 0,
  total_spots: 0,
  fill_rate: 0,
  total_followers: 0,
  new_followers: 0,
  avg_rating: 0,
  ratings_count: 0,
  active_hosts: 0,
  total_revenue: 0,
  currency_symbol: '₹',
};

const fullNameOf = (u: any) =>
  `${u?.profile?.first_name ?? ''} ${u?.profile?.last_name ?? ''}`.trim();

/** The Club Studio list is a section, not an archive — the same cap venuePods
 * uses, so both studios page the same way. Summary figures are NOT capped. */
const CLUB_POD_LIMIT = 500;

/** Pods across `clubIds`, newest first, at every lifecycle stage (cancelled and
 * awaiting-venue-approval included, like clubAdminPodsTable). The row shape
 * mirrors venuePodsService.listForOwner field-for-field so Club Studio and
 * Venue Studio share one client component. Callers pass an ALREADY-SCOPED club
 * id list — this function does no permission work. */
async function buildClubPods(clubIds: string[]) {
  if (clubIds.length === 0) return [];
  const clubOids = clubIds.map((id) => new Types.ObjectId(id));
  const [clubs, pods] = await Promise.all([
    ClubModel.find({ _id: { $in: clubOids } }).select('club_name').lean(),
    // lean(): plain DB shapes, so legacy pods keep their genuinely-missing fields.
    PodModel.find({ club_id: { $in: clubOids } })
      .setOptions({ includeDeleted: true })
      .sort({ pod_date_time: -1 })
      .limit(CLUB_POD_LIMIT)
      .lean(),
  ]);
  const clubNameById = new Map<string, string>(
    (clubs as any[]).map((c) => [String(c._id), c.club_name])
  );
  const hostIds = [...new Set((pods as any[]).flatMap((p) => (p.pod_hosts_id ?? []).map(String)))];
  const hosts = await UserModel.find({ _id: { $in: hostIds } })
    .select('profile.first_name profile.last_name')
    .lean();
  const hostNameById = new Map<string, string>(
    (hosts as any[]).map((u) => [String(u._id), fullNameOf(u)])
  );
  const now = Date.now();
  return (pods as any[]).map((pod) => ({
    id: String(pod._id),
    pod_slug: pod.pod_id,
    pod_title: pod.pod_title,
    pod_date_time: pod.pod_date_time?.toISOString?.() ?? '',
    pod_end_date_time: pod.pod_end_date_time?.toISOString?.() ?? null,
    pod_amount: pod.pod_amount ?? 0,
    pod_type: pod.pod_type,
    no_of_spots: pod.no_of_spots ?? 0,
    attendee_count: podSeatsTaken(pod),
    pod_attendees: (pod.pod_attendees ?? []).map(String),
    host_names: (pod.pod_hosts_id ?? [])
      .map((id: any) => hostNameById.get(String(id)))
      .filter(Boolean) as string[],
    club_id: String(pod.club_id),
    // The pods query is filtered to those clubs above, so the lookup always
    // hits — hence the non-null assertion instead of a dead fallback.
    club_name: clubNameById.get(String(pod.club_id))!,
    bucket: bucketForPod(pod, now).toUpperCase(),
    is_active: !!pod.is_active,
    completed_at: pod.completed_at?.toISOString?.() ?? null,
    cancelled_at: pod.deleted_at?.toISOString?.() ?? null,
    created_at: pod.created_at?.toISOString?.() ?? '',
  }));
}

type ClubPodTally = {
  counts: HostStatusCounts;
  total_spots: number;
  filled_spots: number;
  total_attendees: number;
  /** Start time of the soonest upcoming pod, ms. */
  next_at: number | null;
};

/** Fold one pod into the summary tally. A cancelled pod counts in `counts` and
 * nowhere else: its spots were never sold, so it must not dilute fill rate. */
function foldClubPod(tally: ClubPodTally, pod: any, now: number) {
  const bucket = bucketForPod(pod, now);
  tally.counts[bucket] += 1;
  if (bucket === 'cancelled') return;
  tally.total_spots += pod.no_of_spots ?? 0;
  tally.filled_spots += podSeatsTaken(pod);
  tally.total_attendees += pod.pod_attendees?.length ?? 0;
  if (bucket !== 'upcoming') return;
  // A pod with an unreadable date buckets as upcoming (bucketForPod's fallback)
  // but must never become `next` — NaN would blow up toISOString().
  const start = +new Date(pod.pod_date_time);
  if (Number.isNaN(start)) return;
  if (tally.next_at === null || start < tally.next_at) tally.next_at = start;
}

const EMPTY_CLUB_POD_SUMMARY = {
  clubs: 0,
  total: 0,
  upcoming: 0,
  ongoing: 0,
  completed: 0,
  cancelled: 0,
  total_spots: 0,
  filled_spots: 0,
  total_attendees: 0,
  fill_rate: 0,
  next_pod_date_time: null as string | null,
  total_revenue: 0,
  currency_symbol: EMPTY_KPIS.currency_symbol,
};

/** Header figures for the Club Studio pods section, over EVERY pod in scope —
 * the list is capped, these numbers are not. Revenue is the SUCCESS payments on
 * the non-cancelled pods (a cancelled pod's payments were refunded). Callers
 * pass an ALREADY-SCOPED club id list. */
async function buildClubPodSummary(clubIds: string[]) {
  // Shared with Venue Studio — see studio-summary.ts for why the arithmetic
  // lives in exactly one place.
  const summary = await buildStudioPodSummary(
    { club_id: { $in: clubIds.map((id) => new Types.ObjectId(id)) } },
    clubIds.length,
  );
  return summary;
}

export const clubAdminService = {
  /** Clubs the user administers (admin_user_ids membership), public-shaped so the
   * existing `Club` field resolvers can read them. */
  async listAdminClubs(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return [];
    const docs = await ClubModel.find({ admin_user_ids: new Types.ObjectId(userId) }).sort({
      club_name: 1,
    });
    return docs.map(mapClubToPublic);
  },

  async adminClubIds(userId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(userId)) return [];
    const docs = await ClubModel.find({ admin_user_ids: new Types.ObjectId(userId) })
      .select('_id')
      .lean();
    return docs.map((d: any) => String(d._id));
  },

  /** Paginated + filtered admin-clubs list for the "Your Clubs" page. Search
   * matches club name/slug; the category filter cascades Super → Category → Sub.
   * A club stores super_category_id + category_id (the SUB leaf), so a middle
   * "Category" filter resolves to that category's sub ids and matches on those. */
  async listAdminClubsPage(
    userId: string,
    filter: {
      search?: string | null;
      super_category_id?: string | null;
      category_id?: string | null;
      sub_category_id?: string | null;
      limit?: number | null;
      offset?: number | null;
    } = {}
  ) {
    if (!Types.ObjectId.isValid(userId)) return { items: [], total: 0 };
    const q: any = { admin_user_ids: new Types.ObjectId(userId) };
    if (filter.search?.trim()) {
      const rx = new RegExp(escapeRegExp(filter.search.trim()), 'i');
      q.$or = [{ club_name: rx }, { club_id: rx }];
    }
    if (filter.sub_category_id) {
      q.category_id = filter.sub_category_id;
    } else if (filter.category_id) {
      const subs = await CategoryModel.find({ parent_id: filter.category_id })
        .select('_id')
        .lean();
      q.category_id = { $in: subs.map((s: any) => s._id) };
    } else if (filter.super_category_id) {
      q.super_category_id = filter.super_category_id;
    }
    const total = await ClubModel.countDocuments(q);
    const limit = Math.min(Math.max(filter.limit ?? 12, 1), 100);
    const offset = Math.max(filter.offset ?? 0, 0);
    const docs = await ClubModel.find(q).sort({ club_name: 1 }).skip(offset).limit(limit);
    return { items: docs.map(mapClubToPublic), total };
  },

  /** Throw FORBIDDEN unless the actor is SUPER_ADMIN or an admin of `clubId`. */
  async assertClubAdmin(actor: Actor, clubId: string) {
    if (actor.roles?.includes('SUPER_ADMIN')) return;
    if (!clubId || !Types.ObjectId.isValid(clubId)) forbidden();
    const ok = await ClubModel.exists({
      _id: clubId,
      admin_user_ids: new Types.ObjectId(actor.id),
    });
    if (!ok) forbidden();
  },

  /** Club admins reach their club's pods at every stage, so a cancelled
   * (soft-deleted) pod still resolves here — membership is what gates it. */
  async assertClubAdminForPod(actor: Actor, podDocId: string) {
    if (!Types.ObjectId.isValid(podDocId)) podNotFound();
    const pod = await PodModel.findById(podDocId)
      .setOptions({ includeDeleted: true })
      .select('club_id')
      .lean();
    if (!pod) podNotFound();
    await this.assertClubAdmin(actor, String((pod as any).club_id));
  },

  /**
   * The pod-detail reads a Club Admin gets for a pod in one of THEIR clubs.
   *
   * Each is the club-admin twin of an admin query that `requireRole` guards.
   * They exist separately rather than as extra roles on the admin ones because
   * CLUB_ADMIN is a membership of a club, not a role on the user — there is no
   * role to add. Every one of them gates on `assertClubAdminForPod` FIRST, so
   * the pod itself is what proves the caller may read any of this.
   */
  async podAttendees(actor: Actor, podDocId: string) {
    await this.assertClubAdminForPod(actor, podDocId);
    const { podMemberService } = await import('@modules/pods/podMember/podMember.service');
    return podMemberService.listAdminAttendees(podDocId);
  },

  async podPayments(actor: Actor, podDocId: string, query?: any) {
    await this.assertClubAdminForPod(actor, podDocId);
    const { paymentService } = await import('@modules/finance/payment/payment.service');
    // tableForPod, never table: the pod filter must not be something the
    // caller can widen through the query input.
    return paymentService.tableForPod(podDocId, query);
  },

  async podFeedback(actor: Actor, podDocId: string, limit?: number | null) {
    await this.assertClubAdminForPod(actor, podDocId);
    const { bouncerService } = await import('@modules/support/bouncer/bouncer.service');
    return bouncerService.podFeedback(podDocId, limit ?? 20);
  },

  /** The host profile behind one of THIS pod's hosts. Scoped to the pod so a
   * club admin cannot look up an arbitrary host by id. */
  async podHost(actor: Actor, podDocId: string, userId: string) {
    await this.assertClubAdminForPod(actor, podDocId);
    const pod = await PodModel.findById(podDocId)
      .setOptions({ includeDeleted: true })
      .select('pod_hosts_id')
      .lean();
    const hosts = ((pod as any)?.pod_hosts_id ?? []).map(String);
    if (!hosts.includes(String(userId))) return null;
    const { hostService } = await import('@modules/venues/host/host.service');
    return hostService.getByUser(String(userId));
  },

  /** Approved hosts matching the search, for the club admin assign-host picker.
   * Guarded on administering at least one club (SUPER_ADMIN bypasses). */
  async searchHosts(actor: Actor, search?: string | null) {
    if (!actor.roles?.includes('SUPER_ADMIN')) {
      const administersAny = await ClubModel.exists({
        admin_user_ids: new Types.ObjectId(actor.id),
      });
      if (!administersAny) forbidden();
    }
    const hostDocs = await HostModel.find({ status: 'APPROVED' }).select('user_id').lean();
    const hostUserIds = hostDocs.map((h: any) => h.user_id);
    if (hostUserIds.length === 0) return [];
    const q: any = { _id: { $in: hostUserIds } };
    const term = search?.trim();
    if (term) {
      const re = new RegExp(escapeRegExp(term), 'i');
      q.$or = [
        { 'profile.first_name': re },
        { 'profile.last_name': re },
        { 'auth.email': re },
      ];
    }
    const users = await UserModel.find(q)
      .select('profile.first_name profile.last_name auth.email')
      .limit(20)
      .lean();
    return users.map((u: any) => ({
      user_id: String(u._id),
      full_name: fullNameOf(u),
      email: u.auth?.email ?? null,
    }));
  },

  /**
   * THE club-scoping rule: every club id a pod read may touch. `clubId` only
   * NARROWS within the actor's own clubs (assertClubAdmin throws FORBIDDEN for
   * one they do not administer); omitted means all of them. SUPER_ADMIN with no
   * clubs still sees nothing without a club_id — the Admin portal is that
   * role's surface.
   *
   * Deliberately one function shared by the portal table and the app section:
   * two implementations of the same scope is how one of them ends up wrong.
   */
  async scopedClubIds(actor: Actor, clubId?: string | null): Promise<string[]> {
    if (!clubId) return this.adminClubIds(actor.id);
    await this.assertClubAdmin(actor, clubId);
    return [clubId];
  },

  /**
   * Pods across the actor's clubs, at every stage. Scope is resolved HERE and
   * pinned into the query's baseFilter, so a client filter can never widen it
   * to a club the actor does not administer.
   *
   * `status` narrows to ONE of the buckets the table's Status column shows.
   * It is an argument rather than a column filter because the chip is derived
   * from four fields at once — see pod.rowStatus.
   */
  async podsTable(
    actor: Actor,
    clubId: string | null | undefined,
    query?: any,
    status?: PodRowStatus | null
  ) {
    return podService.tableForClubAdmin(await this.scopedClubIds(actor, clubId), query, status);
  },

  /** Club Studio → "Your Pods": the same scope as podsTable, rendered as a flat
   * app-shaped list instead of a portal table page. */
  async myPods(actor: Actor, clubId?: string | null) {
    return buildClubPods(await this.scopedClubIds(actor, clubId));
  },

  /** Header figures for that section, so the apps never compute money or state
   * counts themselves. */
  async myPodsSummary(actor: Actor, clubId?: string | null) {
    return buildClubPodSummary(await this.scopedClubIds(actor, clubId));
  },

  /** One pod in the actor's clubs, cancelled ones included — what the club-admin
   * pod editor prefills from. */
  async podForEdit(actor: Actor, podDocId: string) {
    await this.assertClubAdminForPod(actor, podDocId);
    return podService.getById(podDocId, { includeDeleted: true });
  },

  /** The AI-monitored action trail of one pod in the actor's clubs. */
  async podAuditLogs(actor: Actor, podDocId: string) {
    await this.assertClubAdminForPod(actor, podDocId);
    return podAuditService.listForPod(podDocId);
  },

  /** Full pod create under a club the actor administers. Reuses podService.create
   * after the club-membership guard. The partner pod form does not collect hosts
   * (the host self-serve flow injects the creator server-side), so record the
   * club admin as the pod's host when none are supplied — podService.create
   * requires at least one host. */
  async createPod(actor: Actor, input: any) {
    await this.assertClubAdmin(actor, String(input?.club_id ?? ''));
    const withHost = input?.pod_hosts_id?.length
      ? input
      : { ...input, pod_hosts_id: [actor.id] };
    return podService.create(withHost, { actorUserId: actor.id, source: 'CLUB_ADMIN' });
  },

  /** Full pod edit for a pod in the actor's clubs. Also guards the target club
   * when the pod is being moved to a different club. An empty hosts array from
   * the form means "unchanged" — drop it so a pod's existing hosts are never
   * wiped (a pod must always keep at least one host). */
  async updatePod(actor: Actor, podDocId: string, input: any) {
    await this.assertClubAdminForPod(actor, podDocId);
    if (input?.club_id) await this.assertClubAdmin(actor, String(input.club_id));
    const clean = { ...input };
    if (Array.isArray(clean.pod_hosts_id) && clean.pod_hosts_id.length === 0) {
      delete clean.pod_hosts_id;
    }
    return podService.update(podDocId, clean, {
      actorUserId: actor.id,
      source: 'CLUB_ADMIN',
      includeDeleted: true,
    });
  },

  /** Soft-delete a pod in the actor's clubs (same soft-delete as the admin path). */
  async deletePod(actor: Actor, podDocId: string) {
    await this.assertClubAdminForPod(actor, podDocId);
    return podService.remove(podDocId, { actorUserId: actor.id, source: 'CLUB_ADMIN' });
  },

  /** Edit a club the actor administers, from the Partners portal. Governance
   * fields (admin assignment, verified badge, active flag) are stripped so a
   * club admin can only edit their club's content — never grant themselves
   * co-admins, self-verify, or deactivate the club. */
  async updateClub(actor: Actor, clubDocId: string, input: any) {
    await this.assertClubAdmin(actor, clubDocId);
    const clean = { ...input };
    delete clean.admin_user_ids;
    delete clean.is_verified;
    delete clean.is_active;
    return clubService.update(clubDocId, clean);
  },

  /**
   * Rich dashboard scoped to the user's assigned clubs: KPIs, monthly trend
   * series (pods / bookings / followers / revenue) and a per-club breakdown.
   *
   * EVERY figure answers to the date window, on one of two bases:
   *
   *   FLOW  — things that HAPPENED in the window: pods (and the capacity,
   *           attendees, hosts and fill rate derived from them), bookings,
   *           back-outs, new followers, revenue, and the per-club pods +
   *           revenue columns.
   *   STOCK — things that ARE, measured as of the window's end: assigned
   *           clubs, total followers, the rating average and its count, and
   *           the per-club followers + rating columns. A club that took no new
   *           ratings this month still has the rating it earned, so scoping
   *           these like a flow would report 0.0 rather than the truth.
   *
   * An absent bound is unbounded (see DashboardRange), which is what lets the
   * presets send a start and no end: "Last 30 days" then still counts the pods
   * scheduled ahead, and total_pods stays upcoming + completed for every range.
   */
  async dashboard(userId: string, from?: string | null, to?: string | null) {
    const fromDate = parseBound(from, 'from');
    const toDate = parseBound(to, 'to');

    const clubDocs = Types.ObjectId.isValid(userId)
      ? await ClubModel.find({ admin_user_ids: new Types.ObjectId(userId) })
          .select('_id club_id club_name')
          .lean()
      : [];
    if (clubDocs.length === 0) {
      return { kpis: { ...EMPTY_KPIS }, trend: [], clubs: [] };
    }
    const clubOids = clubDocs.map((c: any) => c._id);
    const now = Date.now();

    const pods = await PodModel.find({ club_id: { $in: clubOids }, deleted_at: null })
      .select('_id club_id pod_date_time is_active no_of_spots pod_attendees extra_seats pod_hosts_id')
      .lean();
    const podIds = pods.map((p: any) => p._id);
    const podToClub = new Map<string, string>(
      pods.map((p: any) => [String(p._id), String(p.club_id)])
    );

    const byClub = new Map<string, ClubTally>();
    clubDocs.forEach((c: any) =>
      byClub.set(String(c._id), { upcoming: 0, completed: 0, total: 0, revenue: 0 })
    );
    const range: DashboardRange = { from: fromDate, to: toDate, now };
    const {
      total_pods,
      upcoming_pods,
      completed_pods,
      total_spots,
      total_attendees,
      hostSet,
      podsSeries,
    } = tallyPods(pods as any[], byClub, range);

    // The two bases the KPIs are read on (see the doc comment above): things
    // that happened INSIDE the window, and things that stand AS OF its end.
    const inWindow = rangeFilter('created_at', fromDate, toDate);
    const asOfWindowEnd = rangeFilter('created_at', null, toDate);

    const [bookings, backed_out, followers, new_followers, ratingAgg, payments, followerRows, bookingRows, followerClubRows, ratingClubRows] =
      await Promise.all([
        PodMemberModel.countDocuments({ pod_id: { $in: podIds }, status: 'JOINED', ...inWindow }),
        PodMemberModel.countDocuments({ pod_id: { $in: podIds }, status: 'BACKED_OUT', ...inWindow }),
        ClubFollowerModel.countDocuments({ club_id: { $in: clubOids }, ...asOfWindowEnd }),
        ClubFollowerModel.countDocuments({ club_id: { $in: clubOids }, ...inWindow }),
        ClubRatingModel.aggregate([
          { $match: { club_id: { $in: clubOids }, ...asOfWindowEnd } },
          { $group: { _id: null, avg: { $avg: '$stars' }, count: { $sum: 1 } } },
        ]),
        // Deliberately NOT date-filtered here: tallyRevenue is the one place
        // that decides which payments the window keeps, and the same rows also
        // date the "All time" trend series.
        PaymentModel.find({ pod_id: { $in: podIds }, status: 'SUCCESS' })
          .select('pod_id total currency_symbol created_at')
          .lean(),
        ClubFollowerModel.aggregate([
          { $match: { club_id: { $in: clubOids }, ...inWindow } },
          { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$created_at' } }, count: { $sum: 1 } } },
        ]),
        PodMemberModel.aggregate([
          { $match: { pod_id: { $in: podIds }, status: 'JOINED', ...inWindow } },
          { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$created_at' } }, count: { $sum: 1 } } },
        ]),
        ClubFollowerModel.aggregate([
          { $match: { club_id: { $in: clubOids }, ...asOfWindowEnd } },
          { $group: { _id: '$club_id', count: { $sum: 1 } } },
        ]),
        ClubRatingModel.aggregate([
          { $match: { club_id: { $in: clubOids }, ...asOfWindowEnd } },
          { $group: { _id: '$club_id', avg: { $avg: '$stars' } } },
        ]),
      ]);

    const currency_symbol = (payments[0] as any)?.currency_symbol || '₹';
    const { total_revenue, revenueSeries } = tallyRevenue(
      payments as any[],
      podToClub,
      byClub,
      range
    );

    const followerSeries = new Map<string, number>(
      (followerRows as any[]).map((r) => [r._id, r.count])
    );
    const bookingSeries = new Map<string, number>(
      (bookingRows as any[]).map((r) => [r._id, r.count])
    );
    const followerByClub = new Map<string, number>(
      (followerClubRows as any[]).map((r) => [String(r._id), r.count])
    );
    const ratingByClub = new Map<string, number>(
      (ratingClubRows as any[]).map((r) => [String(r._id), r.avg ?? 0])
    );

    // The chart plots what has already happened, so it always stops at this
    // month even when the window runs on: bookings, followers and revenue can
    // have no future values, and drawing them to 0 past today reads as a crash
    // rather than as "not yet".
    const trendFrom = fromDate ?? earliestActivity(pods as any[], payments as any[], now);
    const trendTo = new Date(Math.min(+(toDate ?? new Date(now)), now));

    const trend = monthSequence(trendFrom, trendTo).map((m) => ({
      label: m.label,
      pods: podsSeries.get(m.key) ?? 0,
      bookings: bookingSeries.get(m.key) ?? 0,
      followers: followerSeries.get(m.key) ?? 0,
      revenue: revenueSeries.get(m.key) ?? 0,
    }));

    const clubs = clubDocs.map((c: any) => {
      const tally = byClub.get(String(c._id))!;
      return {
        club_id: String(c._id),
        club_slug: c.club_id,
        club_name: c.club_name,
        total_pods: tally.total,
        upcoming_pods: tally.upcoming,
        completed_pods: tally.completed,
        followers: followerByClub.get(String(c._id)) ?? 0,
        rating: ratingByClub.get(String(c._id)) ?? 0,
        revenue: tally.revenue,
      };
    });

    const kpis = {
      assigned_clubs: clubDocs.length,
      total_pods,
      upcoming_pods,
      completed_pods,
      total_bookings: bookings,
      backed_out,
      total_attendees,
      total_spots,
      fill_rate: total_spots > 0 ? total_attendees / total_spots : 0,
      total_followers: followers,
      new_followers,
      avg_rating: (ratingAgg as any[])[0]?.avg ?? 0,
      ratings_count: (ratingAgg as any[])[0]?.count ?? 0,
      active_hosts: hostSet.size,
      total_revenue,
      currency_symbol,
    };

    return { kpis, trend, clubs };
  },

  /** Server-side table page over the COMPUTED per-club dashboard rows for the
   * clubAdminDashboardTable query. Rows come from dashboard() (already scoped
   * to the caller's assigned clubs), then search/filter/sort/paginate in
   * memory — a client query can never reach another admin's clubs. */
  async dashboardClubsTable(
    userId: string,
    input?: TableQueryInput | null,
    from?: string | null,
    to?: string | null
  ) {
    const { clubs } = await this.dashboard(userId, from, to);
    return applyTableQueryInMemory(clubs, input, CLUB_ADMIN_CLUB_ROW_TABLE_CONFIG);
  },

  /** Max-info table page over the caller's assigned clubs for the Partner
   * "Your Clubs" table (myAdminClubsTable). Rows are computed in memory then
   * searched/filtered/sorted/paginated via the shared engine — the row set is
   * pre-scoped to admin_user_ids, so a client query can never widen it. */
  async clubsInfoTable(userId: string, input?: TableQueryInput | null) {
    const clubs = Types.ObjectId.isValid(userId)
      ? await ClubModel.find({ admin_user_ids: new Types.ObjectId(userId) }).lean()
      : [];
    const rows = await buildClubInfoRows(clubs as any[]);
    return applyTableQueryInMemory(rows, input, MY_ADMIN_CLUBS_TABLE_CONFIG);
  },
};
