import { LEADERBOARD_CATEGORIES, LeaderboardPointModel, type ILeaderboardPoint } from './leaderboard.model';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

/**
 * Read-only admin views over the points ledger for Admin > Leaderboard. Kept
 * apart from leaderboard.service.ts so the settlement-critical award path
 * stays a small file with one job. Nothing here writes.
 */

/** Allowlists for the shared table engine (leaderboardPointsTable — DUNCIT
 * TABLE CONTRACT v1). The user name and pod title are joined AFTER the page is
 * fetched, so they are deliberately absent from search/sort. */
const POINTS_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['source_id'],
  sortFields: {
    created_at: 'created_at',
    points: 'points',
    category: 'category',
    source_type: 'source_type',
  },
  filterFields: {
    category: { type: 'enum' },
    source_type: { type: 'enum' },
    points: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

interface UserInfo {
  name: string;
  email: string;
}

async function loadUserMap(userIds: string[]): Promise<Map<string, UserInfo>> {
  if (userIds.length === 0) return new Map();
  const rows = await UserModel.find({ _id: { $in: userIds } }).select(
    'profile.first_name profile.last_name auth.email'
  );
  return new Map(
    rows.map((u: any) => [
      String(u._id),
      {
        name: [u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(' ').trim(),
        email: u.auth?.email ?? '',
      },
    ])
  );
}

/** includeDeleted is load-bearing: a points row for a since-cancelled pod is
 * still a real ledger row and must render its pod, not a blank. */
async function loadPodTitleMap(podIds: string[]): Promise<Map<string, string>> {
  if (podIds.length === 0) return new Map();
  const rows = await PodModel.find({ _id: { $in: podIds } })
    .select('pod_title')
    .setOptions({ includeDeleted: true })
    .lean();
  return new Map(rows.map((p: any) => [String(p._id), p.pod_title ?? '']));
}

const toAdminRow = (
  doc: ILeaderboardPoint,
  users: Map<string, UserInfo>,
  podTitles: Map<string, string>
) => {
  const user = users.get(String(doc.user_id));
  return {
    id: doc._id.toString(),
    category: doc.category,
    user_id: String(doc.user_id),
    user_name: user?.name ?? '',
    user_email: user?.email ?? '',
    points: doc.points,
    source_type: doc.source_type,
    source_id: doc.source_id,
    pod_id: doc.pod_id ? String(doc.pod_id) : null,
    pod_title: doc.pod_id ? podTitles.get(String(doc.pod_id)) ?? '' : '',
    created_at: doc.created_at?.toISOString?.() ?? '',
  };
};

export const leaderboardAdminService = {
  /** One headline card per board: points circulated, awards written, and how
   * many distinct users hold at least one point. */
  async stats() {
    const grouped = await LeaderboardPointModel.aggregate([
      {
        $group: {
          _id: { category: '$category', user: '$user_id' },
          points: { $sum: '$points' },
          awards: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.category',
          total_points: { $sum: '$points' },
          awards_count: { $sum: '$awards' },
          participants: { $sum: 1 },
        },
      },
    ]);
    const byCategory = new Map<string, any>(grouped.map((row: any) => [row._id, row]));
    // Every board is emitted, so an unused one reads as zeroes rather than
    // vanishing from the dashboard.
    return LEADERBOARD_CATEGORIES.map((category) => ({
      category,
      total_points: byCategory.get(category)?.total_points ?? 0,
      awards_count: byCategory.get(category)?.awards_count ?? 0,
      participants: byCategory.get(category)?.participants ?? 0,
    }));
  },

  /** One page of the points ledger, each row named for the admin table. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<ILeaderboardPoint>(
      LeaderboardPointModel,
      {},
      input,
      POINTS_TABLE_CONFIG
    );
    const userIds = [...new Set(docs.map((d) => String(d.user_id)))];
    const podIds = [...new Set(docs.filter((d) => d.pod_id).map((d) => String(d.pod_id)))];
    const [users, podTitles] = await Promise.all([loadUserMap(userIds), loadPodTitleMap(podIds)]);
    return { rows: docs.map((d) => toAdminRow(d, users, podTitles)), total, page, page_size };
  },
};
