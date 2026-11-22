import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import type { HostEngagementSettings } from '@modules/platform/settings/settings.hostEngagement';
import { clubAdminService } from '../clubAdmin.service';
import { applyTableQueryInMemory, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { contactNumber, userContactNumber } from '@utils/contact';
import { getAppTimeZone } from '@utils/app-time';
import {
  ClubHostEngagementModel,
  ENGAGEMENT_HISTORY_CAP,
  HostPerformanceSnapshotModel,
  type HostUserLean,
} from './clubHosts.models';
import { clubHostIds, hostPodStatsForClubs, isClubHost, statsFor } from './clubHosts.stats';
import {
  hostPerformanceScore,
  isHostInactive,
  isUnderperforming,
  periodOf,
  periodRange,
  recentPeriods,
} from './hostPerformance.math';

type Actor = { id: string; roles?: string[] };

const DAY_MS = 24 * 60 * 60 * 1000;
/** Finished months the host page's score history reaches back. */
const HISTORY_MONTHS = 6;
const USER_FIELDS =
  'profile.first_name profile.last_name profile.profile_photo auth.email auth.phone communication.whatsapp';

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

const nameOf = (u: HostUserLean) => `${u?.profile?.first_name ?? ''} ${u?.profile?.last_name ?? ''}`.trim();

/** One row of the club admin's Hosts table — the host, their reach, their month. */
export interface ClubHostRow extends Record<string, unknown> {
  user_id: string;
  name: string;
  photo_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  last_pod_at: string | null;
  days_since_last_pod: number | null;
  completed_this_month: number;
  upcoming_count: number;
  monthly_target: number;
  score: number;
  is_inactive: boolean;
  is_underperforming: boolean;
  engagement_status_key: string;
  engagement_status_label: string;
  engagement_note: string | null;
  engagement_updated_at: string | null;
}

const HOSTS_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'email', 'phone', 'whatsapp'],
  sortFields: {
    name: 'name',
    last_pod_at: 'last_pod_at',
    completed_this_month: 'completed_this_month',
    upcoming_count: 'upcoming_count',
    score: 'score',
    engagement_status_label: 'engagement_status_label',
  },
  filterFields: {
    name: { type: 'string' },
    completed_this_month: { type: 'number' },
    upcoming_count: { type: 'number' },
    score: { type: 'number' },
    is_inactive: { type: 'boolean' },
    is_underperforming: { type: 'boolean' },
    engagement_status_key: { type: 'enum' },
  },
  // Inactive hosts first — they are why the page exists — then by name.
  defaultSort: { is_inactive: -1, name: 1 },
};

/** The status a host shows: what their admin filed, else the first active status. */
function statusOf(settings: HostEngagementSettings, key?: string | null) {
  const fallback = settings.statuses.find((s) => s.is_active) ?? settings.statuses[0];
  const status = settings.statuses.find((s) => s.key === key) ?? fallback;
  return { key: status.key, label: status.label };
}

interface ClubContext {
  club: { _id: Types.ObjectId; club_name?: string; host_ids?: unknown[] };
  settings: HostEngagementSettings;
  now: Date;
}

/** The club, after proving the caller administers it. */
async function loadClub(actor: Actor, clubId: string): Promise<ClubContext> {
  await clubAdminService.assertClubAdmin(actor, clubId);
  const [club, settings] = await Promise.all([
    ClubModel.findById(clubId).select('club_name host_ids').lean(),
    settingsService.getHostEngagementSettings(),
  ]);
  if (!club) throw new GraphQLError('Club not found', { extensions: { code: 'NOT_FOUND' } });
  return { club: club as ClubContext['club'], settings, now: new Date() };
}

/** Every host row of one club: one pod aggregation, one user read, one engagement read. */
async function buildRows(ctx: ClubContext, onlyHostId?: string): Promise<ClubHostRow[]> {
  const clubId = String(ctx.club._id);
  const range = periodRange(periodOf(ctx.now, getAppTimeZone()), getAppTimeZone());
  const stats = await hostPodStatsForClubs([clubId], range, ctx.now);
  const ids = clubHostIds(ctx.club, stats).filter((id) => !onlyHostId || id === onlyHostId);
  if (ids.length === 0) return [];
  const [users, engagements] = await Promise.all([
    UserModel.find({ _id: { $in: ids } }).select(USER_FIELDS).lean<HostUserLean[]>(),
    ClubHostEngagementModel.find({ club_id: ctx.club._id, host_user_id: { $in: ids } })
      .select('host_user_id status_key note updated_at')
      .lean(),
  ]);
  const engagementBy = new Map(engagements.map((e) => [String(e.host_user_id), e]));
  const target = ctx.settings.monthly_pod_target;
  return users.map((u) => {
    const id = String(u._id);
    const s = statsFor(stats, clubId, id);
    const engagement = engagementBy.get(id);
    const status = statusOf(ctx.settings, engagement?.status_key);
    const score = hostPerformanceScore(s.completed_in_period, target);
    return {
      user_id: id,
      name: nameOf(u),
      photo_url: u.profile?.profile_photo ?? null,
      phone: userContactNumber(u),
      whatsapp: contactNumber(u.communication?.whatsapp?.extension, u.communication?.whatsapp?.number),
      email: u.auth?.email ?? null,
      last_pod_at: s.last_pod_at ? s.last_pod_at.toISOString() : null,
      days_since_last_pod: s.last_pod_at ? Math.floor((ctx.now.getTime() - s.last_pod_at.getTime()) / DAY_MS) : null,
      completed_this_month: s.completed_in_period,
      upcoming_count: s.upcoming_count,
      monthly_target: target,
      score,
      is_inactive: isHostInactive(s.last_pod_at, ctx.now, ctx.settings.inactivity_days),
      is_underperforming: isUnderperforming(score, ctx.settings.underperform_threshold_pct),
      engagement_status_key: status.key,
      engagement_status_label: status.label,
      engagement_note: engagement?.note ?? null,
      engagement_updated_at: engagement?.updated_at ? new Date(engagement.updated_at).toISOString() : null,
    };
  });
}

/** Club Admin > Your Clubs > Hosts: who runs this club's pods and how they are doing. */
export const clubHostsService = {
  async hostsTable(actor: Actor, clubId: string, input?: TableQueryInput | null) {
    const rows = await buildRows(await loadClub(actor, clubId));
    return applyTableQueryInMemory(rows, input, HOSTS_TABLE_CONFIG);
  },

  /** The header and the inactive-hosts warning above the table, over EVERY host (not one page). */
  async hostsSummary(actor: Actor, clubId: string) {
    const ctx = await loadClub(actor, clubId);
    const rows = await buildRows(ctx);
    return {
      club_id: clubId,
      club_name: ctx.club.club_name ?? '',
      host_count: rows.length,
      inactive_count: rows.filter((r) => r.is_inactive).length,
      underperforming_count: rows.filter((r) => r.is_underperforming).length,
      inactivity_days: ctx.settings.inactivity_days,
      monthly_pod_target: ctx.settings.monthly_pod_target,
    };
  },

  /** One host of the club: the row, the statuses to pick from, and six finished months of scores. */
  async hostDetail(actor: Actor, clubId: string, userId: string) {
    const ctx = await loadClub(actor, clubId);
    if (!Types.ObjectId.isValid(userId)) return null;
    const [row] = await buildRows(ctx, userId);
    if (!row) return null;
    const lastFinished = recentPeriods(periodOf(ctx.now, getAppTimeZone()), HISTORY_MONTHS + 1).slice(0, -1);
    const snapshots = await HostPerformanceSnapshotModel.find({
      club_id: ctx.club._id,
      host_user_id: new Types.ObjectId(userId),
      period: { $in: lastFinished },
    })
      .select('period completed target score')
      .lean();
    const byPeriod = new Map(snapshots.map((s) => [s.period, s]));
    return {
      ...row,
      club_id: clubId,
      club_name: ctx.club.club_name ?? '',
      inactivity_days: ctx.settings.inactivity_days,
      statuses: ctx.settings.statuses,
      // Months the job has not snapshotted (before the feature shipped) are
      // absent rather than invented as zeros.
      score_history: lastFinished.flatMap((period) => {
        const s = byPeriod.get(period);
        return s ? [{ period, completed: s.completed, target: s.target, score: s.score }] : [];
      }),
    };
  },

  /**
   * File a host under an engagement status. The status must be one of the
   * ACTIVE configured ones, and the user must really host this club — a club
   * admin cannot tag an arbitrary account through someone else's club id.
   * Upserted on (club, host), with the change appended to a capped history.
   */
  async setEngagement(actor: Actor, clubId: string, hostUserId: string, statusKey: string, note?: string | null) {
    const ctx = await loadClub(actor, clubId);
    const status = ctx.settings.statuses.find((s) => s.key === statusKey && s.is_active);
    if (!status) badInput('Pick one of the active engagement statuses.');
    if (!(await isClubHost(ctx.club, hostUserId))) badInput('This person is not a host of this club.');
    const cleanNote = note?.trim() ? note.trim().slice(0, 1000) : null;
    const now = new Date();
    const actorId = new Types.ObjectId(actor.id);
    const doc = await ClubHostEngagementModel.findOneAndUpdate(
      { club_id: ctx.club._id, host_user_id: new Types.ObjectId(hostUserId) },
      {
        $set: { status_key: statusKey, note: cleanNote, updated_by: actorId },
        $push: {
          history: {
            $each: [{ status_key: statusKey, note: cleanNote, updated_by: actorId, updated_at: now }],
            $slice: -ENGAGEMENT_HISTORY_CAP,
          },
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return {
      host_user_id: hostUserId,
      status_key: statusKey,
      status_label: status.label,
      note: doc?.note ?? null,
      updated_at: (doc?.updated_at ?? now).toISOString(),
    };
  },
};
