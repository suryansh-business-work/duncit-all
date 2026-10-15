import type { Types } from 'mongoose';
import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { startClusterJob } from '@utils/clusterJob';
import { appDate, appTime } from '@utils/app-time';
import { trimTrailingSlash } from '@utils/url';
import { PodModel } from '@modules/pods/pod/pod.model';
import { podSeatsAvailable } from '@modules/pods/pod/pod.seats';
import { loadPodClubSlugMap, podNotificationLink } from '@modules/pods/pod/pod.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { notifyEach, type NotifyInput } from '@services/notify/notify.service';
import { loadNotifyRecipients, recipientName } from '@services/notify/notify.recipients';
import { PaymentModel } from './payment.model';

const SWEEP_INTERVAL_MS = 10 * 60_000;
const FIRST_SWEEP_DELAY_MS = 3 * 60_000;
/** Three ticks wide, so a missed tick cannot skip a checkout. The send is
 * keyed per member and pod, so the overlap cannot nudge twice. */
const WINDOW_MS = 3 * SWEEP_INTERVAL_MS;

interface PendingCheckout {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  pod_id: Types.ObjectId;
}

interface NudgePod {
  _id: Types.ObjectId;
  pod_id?: string;
  pod_title: string;
  pod_date_time: Date;
  club_id?: Types.ObjectId | null;
  is_active?: boolean;
  no_of_spots?: number;
  extra_seats?: number;
  pod_attendees?: Types.ObjectId[];
}

/** Still worth finishing: live, not started, and with a seat left (0 spots is unlimited). */
function stillOpen(pod: NudgePod | undefined, now: number): pod is NudgePod {
  if (!pod?.is_active) return false;
  if (new Date(pod.pod_date_time).getTime() <= now) return false;
  return (pod.no_of_spots ?? 0) <= 0 || podSeatsAvailable(pod) > 0;
}

/**
 * ONE nudge to somebody who started paying for a pod and never finished.
 *
 * A checkout left at the bank page used to be forgotten by everybody, the
 * member included. This asks once — never twice for the same member and pod,
 * however many attempts they left behind — and only while the pod still has a
 * seat and has not started. Anybody already on the pod, or who paid on a later
 * attempt, is skipped. It is a nudge, so it rides the opt-out-able categories:
 * a member who switched off reminders or notification mail is not asked.
 *
 * The delay is Admin > Pods > Pod Settings > Unfinished Booking Nudge; 0 is off.
 */
export async function runCheckoutNudges(now = Date.now()): Promise<void> {
  const minutes = await settingsService.getCheckoutNudgeMinutes();
  if (minutes <= 0) return;
  const edge = now - minutes * 60_000;
  const pending = await PaymentModel.find({
    status: 'PENDING',
    target_type: 'POD',
    user_id: { $ne: null },
    pod_id: { $ne: null },
    created_at: { $gte: new Date(edge - WINDOW_MS), $lte: new Date(edge) },
  })
    .select('user_id pod_id')
    .lean<PendingCheckout[]>();
  if (pending.length === 0) return;

  const podIds = [...new Set(pending.map((row) => row.pod_id.toString()))];
  const [pods, paid] = await Promise.all([
    PodModel.find({ _id: { $in: podIds } })
      .select('pod_id pod_title pod_date_time club_id is_active no_of_spots extra_seats pod_attendees')
      .lean<NudgePod[]>(),
    PaymentModel.find({ status: 'SUCCESS', pod_id: { $in: podIds }, user_id: { $in: pending.map((row) => row.user_id) } })
      .select('user_id pod_id')
      .lean<PendingCheckout[]>(),
  ]);
  const podById = new Map(pods.map((pod) => [pod._id.toString(), pod]));
  const paidKeys = new Set(paid.map((row) => `${row.user_id.toString()}:${row.pod_id.toString()}`));

  const due = new Map<string, PendingCheckout>();
  for (const row of pending) {
    const key = `${row.user_id.toString()}:${row.pod_id.toString()}`;
    const pod = podById.get(row.pod_id.toString());
    const joined = pod?.pod_attendees?.some((id) => id.toString() === row.user_id.toString());
    if (paidKeys.has(key) || joined || !stillOpen(pod, now)) continue;
    due.set(key, row);
  }
  if (due.size === 0) return;

  const [users, { mwebUrl }, slugById] = await Promise.all([
    loadNotifyRecipients([...due.values()].map((row) => row.user_id)),
    getUrlConfigs(),
    loadPodClubSlugMap(pods),
  ]);
  const inputs: NotifyInput[] = [];
  for (const [key, row] of due) {
    const pod = podById.get(row.pod_id.toString()) as NudgePod;
    const user = users.get(row.user_id.toString());
    if (!user) continue;
    const name = recipientName(user);
    const path = podNotificationLink(pod, slugById);
    inputs.push({
      event: 'USER_CHECKOUT_PENDING',
      entityId: key,
      user,
      name,
      params: [
        name,
        pod.pod_title,
        `${appDate(pod.pod_date_time)}, ${appTime(pod.pod_date_time)}`,
        `${trimTrailingSlash(mwebUrl)}${path || ''}`,
      ],
    });
  }
  if (inputs.length > 0) await notifyEach(inputs);
}

/** Start the nudge loop on the scheduler leader. A no-op under NODE_ENV=test. */
export function startCheckoutNudgeScheduler(): () => void {
  return startClusterJob({
    component: 'checkout-nudge',
    operation: 'sweep',
    firstDelayMs: FIRST_SWEEP_DELAY_MS,
    intervalMs: SWEEP_INTERVAL_MS,
    run: () =>
      runCheckoutNudges().catch((error) => {
        logs.server.error('checkout-nudge', 'sweep', { error });
      }),
  });
}
