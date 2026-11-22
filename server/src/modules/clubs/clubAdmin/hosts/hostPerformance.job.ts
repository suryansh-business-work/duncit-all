import { Types } from 'mongoose';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import type { HostEngagementSettings } from '@modules/platform/settings/settings.hostEngagement';
import { notifyEach, type NotifyInput } from '@services/notify/notify.service';
import { getUrlConfigs } from '@config/url-configs';
import { appFormat, getAppTimeZone } from '@utils/app-time';
import { startClusterJob } from '@utils/clusterJob';
import { trimTrailingSlash } from '@utils/url';
import { logs } from '@observability/log';
import { HostPerformanceRunModel, HostPerformanceSnapshotModel, type HostUserLean } from './clubHosts.models';
import { clubHostIds, hostPodStatsForClubs, statsFor } from './clubHosts.stats';
import {
  dayOfMonthIn,
  hostPerformanceScore,
  isHostInactive,
  isUnderperforming,
  periodOf,
  periodRange,
  shiftPeriod,
} from './hostPerformance.math';
import {
  clubAdminAlertMessage,
  hostMonthlyMessage,
  type ClubMonth,
  type HostMonthResult,
} from './hostPerformance.notify';

/**
 * The monthly Host Performance run: snapshot every host of every active club
 * for the month that just ended, then (when Pod Settings has it on) send the
 * host and club-admin messages.
 *
 * Due once the admin-zone date reaches Pod Settings' day of the month. The run
 * is CLAIMED on its period before anything is written — a unique index plus a
 * conditional takeover of a FAILED or long-stuck run — so two processes, a
 * restart mid-run or a retry can never calculate a month twice. Snapshots are
 * upserts and every message carries a per-month entityId, so even a takeover
 * that repeats work repeats nothing a person sees.
 */

const HOUR_MS = 60 * 60 * 1000;
/** A RUNNING claim older than this is a crashed run, free to be taken over. */
const STALE_RUN_MS = 6 * HOUR_MS;
const SNAPSHOT_BATCH = 500;
/** The month in a message ("October 2026") — the named pattern employee targets use too. */
const MONTH_LABEL_PATTERN = 'MMMM yyyy';
const USER_FIELDS =
  'profile.first_name profile.last_name profile.locale auth.email auth.phone communication.whatsapp';

const isDuplicate = (error: unknown) => (error as { code?: number })?.code === 11000;

/** Claim the run for `period`; null when another run owns it or it already completed. */
export async function claimRun(period: string, now: Date) {
  try {
    return await HostPerformanceRunModel.create({ period, status: 'RUNNING', started_at: now });
  } catch (error) {
    if (!isDuplicate(error)) throw error;
  }
  return HostPerformanceRunModel.findOneAndUpdate(
    {
      period,
      $or: [
        { status: 'FAILED' },
        { status: 'RUNNING', started_at: { $lte: new Date(now.getTime() - STALE_RUN_MS) } },
      ],
    },
    { $set: { status: 'RUNNING', started_at: now, finished_at: null, error_messages: [] } },
    { new: true }
  ).exec();
}

/** Whether a month's run is due on `now`, and for which month. */
export function duePeriod(now: Date, zone: string, settings: HostEngagementSettings): string | null {
  if (dayOfMonthIn(now, zone) < settings.notify_day) return null;
  return shiftPeriod(periodOf(now, zone), -1);
}

interface ClubLean {
  _id: Types.ObjectId;
  club_name?: string;
  host_ids?: unknown[];
  admin_user_ids?: unknown[];
}

/** Every (club, host) result for the month. */
function monthResults(
  clubs: readonly ClubLean[],
  stats: Awaited<ReturnType<typeof hostPodStatsForClubs>>,
  settings: HostEngagementSettings,
  now: Date
): Map<string, HostMonthResult[]> {
  const byClub = new Map<string, HostMonthResult[]>();
  for (const club of clubs) {
    const clubId = String(club._id);
    byClub.set(
      clubId,
      clubHostIds(club, stats).map((hostId) => {
        const s = statsFor(stats, clubId, hostId);
        const score = hostPerformanceScore(s.completed_in_period, settings.monthly_pod_target);
        return {
          clubId,
          hostId,
          completed: s.completed_in_period,
          target: settings.monthly_pod_target,
          score,
          lastPodAt: s.last_pod_at,
          inactive: isHostInactive(s.last_pod_at, now, settings.inactivity_days),
          underperforming: isUnderperforming(score, settings.underperform_threshold_pct),
        };
      })
    );
  }
  return byClub;
}

async function writeSnapshots(period: string, results: readonly HostMonthResult[], now: Date) {
  for (let i = 0; i < results.length; i += SNAPSHOT_BATCH) {
    const ops = results.slice(i, i + SNAPSHOT_BATCH).map((r) => ({
      updateOne: {
        filter: { club_id: new Types.ObjectId(r.clubId), host_user_id: new Types.ObjectId(r.hostId), period },
        update: { $set: { completed: r.completed, target: r.target, score: r.score, computed_at: now } },
        upsert: true,
      },
    }));
    // eslint-disable-next-line no-await-in-loop
    await HostPerformanceSnapshotModel.bulkWrite(ops, { ordered: false });
  }
}

async function buildMessages(
  clubs: readonly ClubLean[],
  byClub: Map<string, HostMonthResult[]>,
  settings: HostEngagementSettings,
  period: string,
  zone: string
): Promise<{ host: NotifyInput[]; admin: NotifyInput[] }> {
  const ids = new Set<string>();
  for (const club of clubs) {
    for (const r of byClub.get(String(club._id)) ?? []) ids.add(r.hostId);
    for (const id of club.admin_user_ids ?? []) ids.add(String(id));
  }
  const users = new Map(
    (await UserModel.find({ _id: { $in: [...ids] } }).select(USER_FIELDS).lean<HostUserLean[]>()).map((u) => [String(u._id), u])
  );
  const urls = await getUrlConfigs();
  const monthLabel = appFormat(periodRange(period, zone).start, MONTH_LABEL_PATTERN);
  const host: NotifyInput[] = [];
  const admin: NotifyInput[] = [];
  for (const club of clubs) {
    const clubId = String(club._id);
    const results = byClub.get(clubId) ?? [];
    const month: ClubMonth = {
      clubId,
      clubName: club.club_name ?? '',
      period,
      monthLabel,
      hostsUrl: `${trimTrailingSlash(urls.partnersUrl)}/club-admin/clubs/${clubId}/hosts`,
      createPodUrl: `${trimTrailingSlash(urls.mwebUrl)}/create-pod`,
    };
    if (settings.notify_hosts) {
      // eslint-disable-next-line no-await-in-loop
      host.push(...(await Promise.all(results.map((r) => hostMonthlyMessage(month, r, users.get(r.hostId))))));
    }
    const attention = results.filter((r) => r.inactive || r.underperforming);
    if (settings.notify_club_admins && attention.length > 0) {
      for (const adminId of club.admin_user_ids ?? []) {
        admin.push(clubAdminAlertMessage(month, attention, users.get(String(adminId)), users));
      }
    }
  }
  return { host, admin };
}

/** Run one month end to end on an already-claimed run. */
export async function runPeriod(period: string, settings: HostEngagementSettings, now: Date) {
  const zone = getAppTimeZone();
  const clubs = (await ClubModel.find({ is_active: true })
    .select('club_name host_ids admin_user_ids')
    .lean()) as unknown as ClubLean[];
  const stats = await hostPodStatsForClubs(
    clubs.map((c) => String(c._id)),
    periodRange(period, zone),
    now
  );
  const byClub = monthResults(clubs, stats, settings, now);
  const all = [...byClub.values()].flat();
  await writeSnapshots(period, all, now);
  const counts = { clubs: clubs.length, hosts: all.length, host_notified: 0, admin_notified: 0 };
  if (!settings.notify_enabled) return { ...counts, notified: false };
  const messages = await buildMessages(clubs, byClub, settings, period, zone);
  await notifyEach([...messages.host, ...messages.admin]);
  return { ...counts, host_notified: messages.host.length, admin_notified: messages.admin.length, notified: true };
}

/** The scheduler's tick: run last month once it is due, at most once. */
export async function runHostPerformanceIfDue(now: Date = new Date()): Promise<string | null> {
  const settings = await settingsService.getHostEngagementSettings();
  const period = duePeriod(now, getAppTimeZone(), settings);
  if (!period) return null;
  const run = await claimRun(period, now);
  if (!run) return null;
  try {
    const result = await runPeriod(period, settings, now);
    await HostPerformanceRunModel.updateOne(
      { _id: run._id },
      { $set: { ...result, status: 'COMPLETED', finished_at: new Date() } }
    );
    logs.server.info('host-performance', 'run', { period, ...result });
    return period;
  } catch (error) {
    await HostPerformanceRunModel.updateOne(
      { _id: run._id },
      { $set: { status: 'FAILED', finished_at: new Date() }, $push: { error_messages: String((error as Error)?.message ?? error) } }
    );
    throw error;
  }
}

const TICK_MS = HOUR_MS;
const FIRST_TICK_DELAY_MS = 10 * 60 * 1000;

/** Hourly: cheap when nothing is due (one settings read), and a late server still catches up. */
export function startHostPerformanceScheduler(): () => void {
  return startClusterJob({
    component: 'host-performance',
    operation: 'tick',
    firstDelayMs: FIRST_TICK_DELAY_MS,
    intervalMs: TICK_MS,
    run: () => runHostPerformanceIfDue(),
  });
}
