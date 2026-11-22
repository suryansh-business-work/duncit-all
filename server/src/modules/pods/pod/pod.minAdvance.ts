/**
 * Minimum Advance Days for Pod Creation.
 *
 * A host's new pod must start at least N calendar days after today, counted in
 * the admin's time zone (Admin > Settings), so there is time to promote it and
 * fill it. N is the host's own override from the Hosts console when one is set,
 * else the platform's Pod Settings value (default 2).
 *
 * Only a HOST's own pods are held to it — createPartnerPod, publishing a draft,
 * and a venue-rejected pod resubmitted on a new date. Admin, Club Admin and an
 * Auto Pod materialising schedule pods on Duncit's own authority and are not.
 *
 * Twin of `@duncit/utils` pod-min-advance (the server has no @duncit deps):
 * the apps grey out the same days this refuses.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { fromZonedTime } from 'date-fns-tz';
import { appFormat, getAppTimeZone } from '@utils/app-time';
import { HostModel } from '@modules/venues/host/host.model';
import { cleanPodMinAdvanceDays, settingsService } from '@modules/platform/settings/settings.service';

const DAY_MS = 86_400_000;

/** A yyyy-MM-dd day `days` after another (calendar arithmetic, no zone drift). */
const addDays = (key: string, days: number): string =>
  new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** This host's minimum: their override when set, else the platform's. */
export async function podMinAdvanceDaysFor(userId: string): Promise<number> {
  const host = Types.ObjectId.isValid(userId)
    ? await HostModel.findOne({ user_id: new Types.ObjectId(userId) })
        .select('pod_min_advance_days_override')
        .lean<{ pod_min_advance_days_override?: number | null }>()
    : null;
  const override = host?.pod_min_advance_days_override;
  return typeof override === 'number' ? cleanPodMinAdvanceDays(override) : settingsService.getPodMinAdvanceDays();
}

/** The first day a pod may start on (yyyy-MM-dd, app zone) and the instant it begins. */
export function podMinAdvanceWindow(days: number, now = new Date()): { day: string; start: Date } {
  const day = addDays(appFormat(now, 'yyyy-MM-dd'), cleanPodMinAdvanceDays(days));
  return { day, start: fromZonedTime(`${day}T00:00:00`, getAppTimeZone()) };
}

/**
 * Refuses a host's pod that starts before their first allowed day. A start
 * that is missing or unparseable is left to `validateFutureDates`, which owns
 * that message.
 */
export async function assertPodMinAdvance(userId: string, startValue: unknown, now = new Date()): Promise<void> {
  if (startValue === null || startValue === undefined || startValue === '') return;
  const start = new Date(startValue as string | Date);
  if (Number.isNaN(start.getTime())) return;
  const days = await podMinAdvanceDaysFor(userId);
  const window = podMinAdvanceWindow(days, now);
  if (start.getTime() >= window.start.getTime()) return;
  const unit = days === 1 ? 'day' : 'days';
  throw new GraphQLError(
    `You can only create a Pod scheduled at least ${days} ${unit} in advance from the current date.`,
    { extensions: { code: 'BAD_USER_INPUT', reason: 'POD_MIN_ADVANCE', min_advance_days: days, earliest_day: window.day } },
  );
}
