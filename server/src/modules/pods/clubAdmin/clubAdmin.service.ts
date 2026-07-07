import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ClubModel } from '@modules/pods/club/club.model';
import { mapClubToPublic, clubService } from '@modules/pods/club/club.service';
import { CategoryModel } from '@modules/pods/category/category.model';
import { podService } from '@modules/pods/pod/pod.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { ClubRatingModel } from '@modules/pods/club/clubRating.model';
import { ClubFollowerModel } from '@modules/access/user/relations';
import { PaymentModel } from '@modules/finance/payment/payment.model';

type Actor = { id: string; roles?: string[] };

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
 * Guarded to 36 months so a bad range can never produce an unbounded series. */
function monthSequence(from: Date, to: Date) {
  const seq: Array<{ key: string; label: string }> = [];
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  let guard = 0;
  while (cur <= end && guard < 36) {
    seq.push({ key: monthKey(cur), label: MONTH_LABELS[cur.getUTCMonth()] });
    cur.setUTCMonth(cur.getUTCMonth() + 1);
    guard += 1;
  }
  return seq;
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

  async assertClubAdminForPod(actor: Actor, podDocId: string) {
    if (!Types.ObjectId.isValid(podDocId)) podNotFound();
    const pod = await PodModel.findById(podDocId).select('club_id').lean();
    if (!pod) podNotFound();
    await this.assertClubAdmin(actor, String((pod as any).club_id));
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
    return podService.create(withHost);
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
    return podService.update(podDocId, clean);
  },

  /** Soft-delete a pod in the actor's clubs (same soft-delete as the admin path). */
  async deletePod(actor: Actor, podDocId: string) {
    await this.assertClubAdminForPod(actor, podDocId);
    return podService.remove(podDocId);
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

  /** Rich dashboard scoped to the user's assigned clubs: KPIs, monthly trend
   * series (pods / bookings / followers / revenue) and a per-club breakdown. */
  async dashboard(userId: string, from?: string | null, to?: string | null) {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from
      ? new Date(from)
      : new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth() - 5, 1));

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
      .select('_id club_id pod_date_time is_active no_of_spots pod_attendees pod_hosts_id')
      .lean();
    const podIds = pods.map((p: any) => p._id);
    const podToClub = new Map<string, string>(
      pods.map((p: any) => [String(p._id), String(p.club_id)])
    );

    // Per-club + overall pod tallies, computed in-memory (pod_date_time may be a
    // Date or an ISO string, so we normalise via `new Date` rather than aggregate).
    type ClubTally = { upcoming: number; completed: number; total: number; revenue: number };
    const byClub = new Map<string, ClubTally>();
    clubDocs.forEach((c: any) =>
      byClub.set(String(c._id), { upcoming: 0, completed: 0, total: 0, revenue: 0 })
    );
    let upcoming_pods = 0;
    let completed_pods = 0;
    let total_spots = 0;
    let total_attendees = 0;
    const hostSet = new Set<string>();
    const podsSeries = new Map<string, number>();
    for (const p of pods as any[]) {
      const t = +new Date(p.pod_date_time);
      const isUpcoming = p.is_active && t >= now;
      const isCompleted = t < now;
      if (isUpcoming) upcoming_pods += 1;
      if (isCompleted) completed_pods += 1;
      total_spots += p.no_of_spots ?? 0;
      total_attendees += (p.pod_attendees ?? []).length;
      (p.pod_hosts_id ?? []).forEach((h: any) => hostSet.add(String(h)));
      const row = byClub.get(String(p.club_id));
      if (row) {
        row.total += 1;
        if (isUpcoming) row.upcoming += 1;
        if (isCompleted) row.completed += 1;
      }
      const d = new Date(p.pod_date_time);
      if (d >= fromDate && d <= toDate) {
        podsSeries.set(monthKey(d), (podsSeries.get(monthKey(d)) ?? 0) + 1);
      }
    }

    const [bookings, backed_out, followers, new_followers, ratingAgg, payments, followerRows, bookingRows, followerClubRows, ratingClubRows] =
      await Promise.all([
        PodMemberModel.countDocuments({ pod_id: { $in: podIds }, status: 'JOINED' }),
        PodMemberModel.countDocuments({ pod_id: { $in: podIds }, status: 'BACKED_OUT' }),
        ClubFollowerModel.countDocuments({ club_id: { $in: clubOids } }),
        ClubFollowerModel.countDocuments({
          club_id: { $in: clubOids },
          created_at: { $gte: fromDate, $lte: toDate },
        }),
        ClubRatingModel.aggregate([
          { $match: { club_id: { $in: clubOids } } },
          { $group: { _id: null, avg: { $avg: '$stars' }, count: { $sum: 1 } } },
        ]),
        PaymentModel.find({ pod_id: { $in: podIds }, status: 'SUCCESS' })
          .select('pod_id total currency_symbol created_at')
          .lean(),
        ClubFollowerModel.aggregate([
          { $match: { club_id: { $in: clubOids }, created_at: { $gte: fromDate, $lte: toDate } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$created_at' } }, count: { $sum: 1 } } },
        ]),
        PodMemberModel.aggregate([
          { $match: { pod_id: { $in: podIds }, status: 'JOINED', created_at: { $gte: fromDate, $lte: toDate } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$created_at' } }, count: { $sum: 1 } } },
        ]),
        ClubFollowerModel.aggregate([
          { $match: { club_id: { $in: clubOids } } },
          { $group: { _id: '$club_id', count: { $sum: 1 } } },
        ]),
        ClubRatingModel.aggregate([
          { $match: { club_id: { $in: clubOids } } },
          { $group: { _id: '$club_id', avg: { $avg: '$stars' } } },
        ]),
      ]);

    // Revenue (overall + per-club + monthly), summed in-memory from the SUCCESS
    // payments joined back to their pod's club.
    let total_revenue = 0;
    const currency_symbol = (payments[0] as any)?.currency_symbol || '₹';
    const revenueSeries = new Map<string, number>();
    for (const pay of payments as any[]) {
      const amount = pay.total ?? 0;
      total_revenue += amount;
      const clubId = podToClub.get(String(pay.pod_id));
      const row = clubId ? byClub.get(clubId) : undefined;
      if (row) row.revenue += amount;
      const d = new Date(pay.created_at);
      if (d >= fromDate && d <= toDate) {
        revenueSeries.set(monthKey(d), (revenueSeries.get(monthKey(d)) ?? 0) + amount);
      }
    }

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

    const trend = monthSequence(fromDate, toDate).map((m) => ({
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
      total_pods: pods.length,
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
};
