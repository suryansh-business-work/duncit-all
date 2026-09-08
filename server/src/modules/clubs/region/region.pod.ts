/**
 * The drill-down a Regional Club Admin reads: Club Admin -> Clubs -> Pods ->
 * one pod's detail.
 *
 * Every read is the REGION-scoped twin of an operation the Admin portal guards
 * with `requireRole`, and each one gates on `region.scope`'s asserts first, so
 * the pod (or the club) is what proves the caller may read any of it. They
 * exist as separate operations for the same reason the club-admin twins do:
 * a region is a MEMBERSHIP chain — my Club Admins, their clubs, those clubs'
 * pods — and `requireRole` cannot express a chain.
 */
import { Types } from 'mongoose';
import { ClubModel } from '@modules/clubs/club/club.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { LocationModel } from '@modules/platform/location/location.model';
import {
  applyTableQueryInMemory,
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';
import {
  assertRegionClub,
  assertRegionMember,
  assertRegionPod,
  ownRegion,
  regionClubIds,
} from './region.scope';

/** One row of the pods table — the host drawer's and the club drill-down's. */
export interface RegionPodRow {
  id: string;
  pod_id: string;
  pod_title: string;
  pod_date_time: string;
  pod_mode: string;
  pod_amount: number;
  no_of_spots: number;
  club_name: string;
  is_active: boolean;
}

/** The pods table: a host's pods, or one club's. */
const POD_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['pod_title', 'pod_id'],
  sortFields: {
    pod_title: 'pod_title',
    pod_date_time: 'pod_date_time',
    pod_amount: 'pod_amount',
    no_of_spots: 'no_of_spots',
    created_at: 'created_at',
  },
  filterFields: {
    pod_date_time: { type: 'date' },
    pod_mode: { type: 'enum' },
    pod_amount: { type: 'number' },
  },
  defaultSort: { pod_date_time: -1 },
};

/** The clubs table is paged in memory: the rows carry a pod count that only
 * exists once every club in the page is known, so the count cannot be a sort
 * key on a database page. A region holds tens of clubs, not thousands. */
const CLUB_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['club_name', 'club_id', 'city', 'locality'],
  sortFields: {
    club_name: 'club_name',
    club_id: 'club_id',
    city: 'city',
    locality: 'locality',
    pod_count: 'pod_count',
  },
  filterFields: { pod_count: { type: 'number' }, is_active: { type: 'boolean' } },
  defaultSort: { club_name: 1 },
};

interface PodDoc {
  _id: unknown;
  club_id?: unknown;
  pod_id?: string;
  pod_title?: string;
  pod_date_time?: Date;
  pod_mode?: string;
  pod_amount?: number;
  no_of_spots?: number;
  is_active?: boolean;
}

/** The pods page shape, with each pod's club joined on in one extra read. */
async function podPage(
  filter: Record<string, unknown>,
  input: TableQueryInput | null | undefined
) {
  const { docs, total, page, page_size } = await runTableQuery<PodDoc>(
    PodModel,
    filter,
    input,
    POD_TABLE_CONFIG
  );
  const clubs = await ClubModel.find({ _id: { $in: docs.map((pod) => pod.club_id) } })
    .select('club_name')
    .lean();
  const clubName = new Map(clubs.map((club) => [String(club._id), club.club_name]));
  return {
    rows: docs.map((pod) => ({
      id: String(pod._id),
      pod_id: pod.pod_id ?? '',
      pod_title: pod.pod_title ?? '',
      pod_date_time: pod.pod_date_time?.toISOString?.() ?? '',
      pod_mode: pod.pod_mode ?? '',
      pod_amount: pod.pod_amount ?? 0,
      no_of_spots: pod.no_of_spots ?? 0,
      club_name: clubName.get(String(pod.club_id)) ?? '',
      is_active: pod.is_active !== false,
    })),
    total,
    page,
    page_size,
  };
}

const EMPTY_PAGE = { rows: [], total: 0, page: 1, page_size: 25 };

export const regionPodService = {
  /**
   * One host's pods inside this region.
   *
   * Scoped twice: to the region's own clubs AND to the host. A host runs pods
   * for clubs outside this region too, and those are not this manager's to see.
   */
  async hostPods(userId: string, hostUserId: string, input?: TableQueryInput | null) {
    if (!Types.ObjectId.isValid(hostUserId)) return EMPTY_PAGE;
    const region = await ownRegion(userId);
    const clubIds = await regionClubIds(region.club_admin_user_ids ?? []);
    if (clubIds.length === 0) return EMPTY_PAGE;
    return podPage(
      { club_id: { $in: clubIds }, pod_hosts_id: new Types.ObjectId(hostUserId) },
      input
    );
  },

  /**
   * The clubs ONE of the region's Club Admins runs — the row a manager opens
   * from the Club Admins table.
   *
   * The pod count comes from one grouped aggregation over every club in the
   * page rather than a count per row, which is the difference between one
   * round trip and one per club.
   */
  async clubAdminClubs(userId: string, clubAdminId: string, input?: TableQueryInput | null) {
    await assertRegionMember(userId, clubAdminId);
    const clubs = await ClubModel.find({ admin_user_ids: new Types.ObjectId(clubAdminId) })
      .select('club_id club_name location_id locality is_active')
      .lean();
    if (clubs.length === 0) return EMPTY_PAGE;

    const [locations, podCounts] = await Promise.all([
      LocationModel.find({ _id: { $in: clubs.map((club) => club.location_id).filter(Boolean) } })
        .select('location_name city')
        .lean(),
      PodModel.aggregate([
        { $match: { club_id: { $in: clubs.map((club) => club._id) } } },
        { $group: { _id: '$club_id', pods: { $sum: 1 } } },
      ]),
    ]);
    const cityName = new Map(
      locations.map((row) => [String(row._id), row.location_name || row.city || ''])
    );
    const podsPerClub = new Map(podCounts.map((row) => [String(row._id), row.pods as number]));

    const rows = clubs.map((club) => ({
      id: String(club._id),
      club_id: club.club_id ?? '',
      club_name: club.club_name ?? '',
      city: cityName.get(String(club.location_id ?? '')) ?? '',
      locality: club.locality ?? '',
      pod_count: podsPerClub.get(String(club._id)) ?? 0,
      is_active: club.is_active !== false,
    }));
    const paged = applyTableQueryInMemory(rows, input, CLUB_TABLE_CONFIG);
    return { rows: paged.rows, total: paged.total, page: paged.page, page_size: paged.page_size };
  },

  /** One club's pods — the second level of the drill-down. */
  async clubPods(userId: string, clubDocId: string, input?: TableQueryInput | null) {
    await assertRegionClub(userId, clubDocId);
    return podPage({ club_id: new Types.ObjectId(clubDocId) }, input);
  },

  /**
   * The pod-detail reads, each gated on the pod belonging to this region.
   *
   * They delegate to exactly the services the admin and club-admin twins call,
   * so the three audiences can never be shown three different answers about
   * one pod.
   */
  async podAttendees(userId: string, podDocId: string) {
    await assertRegionPod(userId, podDocId);
    const { podMemberService } = await import('@modules/pods/podMember/podMember.service');
    return podMemberService.listAdminAttendees(podDocId);
  },

  async podAuditLogs(userId: string, podDocId: string) {
    await assertRegionPod(userId, podDocId);
    const { podAuditService } = await import('@modules/pods/podAudit/podAudit.service');
    return podAuditService.listForPod(podDocId);
  },

  async podPayments(userId: string, podDocId: string, query?: TableQueryInput | null) {
    await assertRegionPod(userId, podDocId);
    const { paymentService } = await import('@modules/finance/payment/payment.service');
    // tableForPod, never table: the pod filter must not be something the caller
    // can widen through the query input.
    return paymentService.tableForPod(podDocId, query);
  },

  async podFeedback(userId: string, podDocId: string, limit?: number | null) {
    await assertRegionPod(userId, podDocId);
    const { bouncerService } = await import('@modules/support/bouncer/bouncer.service');
    return bouncerService.podFeedback(podDocId, limit ?? 20);
  },

  /** The host profile behind one of THIS pod's hosts. Scoped to the pod so a
   * manager cannot look up an arbitrary host by id. */
  async podHost(userId: string, podDocId: string, hostUserId: string) {
    await assertRegionPod(userId, podDocId);
    const pod = await PodModel.findById(podDocId)
      .setOptions({ includeDeleted: true })
      .select('pod_hosts_id')
      .lean();
    const hosts = ((pod as { pod_hosts_id?: unknown[] } | null)?.pod_hosts_id ?? []).map(String);
    if (!hosts.includes(String(hostUserId))) return null;
    const { hostService } = await import('@modules/venues/host/host.service');
    return hostService.getByUser(String(hostUserId));
  },
};
