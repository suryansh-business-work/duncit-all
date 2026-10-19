/**
 * Background sweep that permanently deletes chat past its retention window
 * (see chat.retention.ts): pod rooms some hours after the pod ends, club rooms
 * message by message once they pass the configured age.
 *
 * Idempotent (plain deletes on a cutoff) and fault-tolerant (the interval
 * survives any DB error), like the draft cleanup. No-ops under NODE_ENV=test
 * through `startClusterJob`.
 */
import { Types } from 'mongoose';
import { startClusterJob } from '@utils/clusterJob';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMessageModel } from './chat.model';
import { chatRetention, clubChatCutoff, HOUR_MS, podChatDeletesAt } from './chat.retention';

const SWEEP_INTERVAL_MS = HOUR_MS;
const FIRST_SWEEP_DELAY_MS = 2 * 60_000;

/** Pod rooms whose pod ended more than `hours` ago. Only pods with a message
 * older than the window can qualify — a message is always posted before the
 * pod ends — which keeps the candidate list to rooms that can actually go. */
async function expiredPodRooms(hours: number, now: number): Promise<string[]> {
  const candidates: string[] = await PodMessageModel.distinct('pod_id', {
    pod_id: { $type: 'string' },
    createdAt: { $lt: new Date(now - hours * HOUR_MS) },
  });
  const ids = candidates.filter((id) => Types.ObjectId.isValid(id));
  if (ids.length === 0) return [];
  // Cancelled pods are soft-deleted; their chat ages out on the same clock.
  const pods = await PodModel.find({ _id: { $in: ids } })
    .select('pod_date_time pod_end_date_time')
    .setOptions({ includeDeleted: true })
    .lean();
  const byId = new Map(pods.map((pod) => [String(pod._id), pod]));
  return ids.filter((id) => {
    const pod = byId.get(id);
    // A room whose pod is gone altogether has nothing left to belong to.
    if (!pod) return true;
    const deletesAt = podChatDeletesAt(pod, hours);
    return !!deletesAt && deletesAt.getTime() <= now;
  });
}

/** Deletes every expired pod room and every club message past its age.
 * Returns how many messages were removed. Safe to run on any schedule. */
export async function runChatRetentionSweep(now = Date.now()): Promise<number> {
  const { podHours, clubDays } = await chatRetention();
  const podIds = await expiredPodRooms(podHours, now);
  const pods = podIds.length
    ? await PodMessageModel.deleteMany({ pod_id: { $in: podIds } })
    : { deletedCount: 0 };
  const clubs = await PodMessageModel.deleteMany({
    club_id: { $type: 'string' },
    createdAt: { $lt: clubChatCutoff(clubDays, now) },
  });
  return (pods.deletedCount ?? 0) + (clubs.deletedCount ?? 0);
}

/** Start the hourly chat retention loop. Returns a stop function. */
export function startChatRetentionScheduler(): () => void {
  return startClusterJob({
    component: 'chat-retention',
    operation: 'sweep',
    firstDelayMs: FIRST_SWEEP_DELAY_MS,
    intervalMs: SWEEP_INTERVAL_MS,
    run: () => runChatRetentionSweep(),
  });
}
