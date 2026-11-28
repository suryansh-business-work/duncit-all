import type { Types } from 'mongoose';
import { logs } from '@observability/log';
import { appDate, appFormat } from '@utils/app-time';
import { startClusterJob } from '@utils/clusterJob';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { UserModel } from '@modules/access/user/user.model';
import { EmailClaimModel } from '@modules/content/emailLog/emailClaim.model';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { consoleUrl } from '@modules/platform/portalMode/portalMode.links';
import { sendEmail } from '@services/email/email.service';
import { NOTIFY_USER_FIELDS, recipientName, type NotifyUser } from '@services/notify/notify.recipients';
import { EmployeeTargetModel, type IEmployeeTarget } from './employeeTarget.model';
import { employeeTargetSettingsService } from './employeeTarget.settings';
import { todayKey } from './employeeTarget.service';
import { parseMonthKey, reminderMonthsFor, windowEndDayKey } from './employeeTarget.rules';

const SWEEP_INTERVAL_MS = 60 * 60_000;
const FIRST_SWEEP_DELAY_MS = 6 * 60_000;
/** The month's name as the email prints it — there is no admin month pattern, only a full-date one. */
const MONTH_LABEL_PATTERN = 'MMMM yyyy';
export const EMPLOYEE_TARGET_REMINDER_TEMPLATE = 'employee-target-reminder';

/** Once per target per app-zone day, however many ticks or workers see it. */
async function claim(targetId: string, day: string): Promise<boolean> {
  try {
    await EmailClaimModel.create({ key: `EMPLOYEE_TARGET_REMINDER|${targetId}|${day}` });
    return true;
  } catch (error) {
    if (isDuplicateKeyError(error)) return false;
    throw error;
  }
}

/** The Employee console's My Targets page, on this environment's host. */
function myTargetsUrl(): string {
  return consoleUrl('employee', '/targets') ?? 'https://employee.duncit.com/targets';
}

/** Noon UTC of a calendar day: the same date in every zone the app is run in. */
const middayOf = (dayKey: string) => new Date(`${dayKey}T12:00:00.000Z`);

function monthLabel(monthKey: string): string {
  const parsed = parseMonthKey(monthKey);
  return parsed ? appFormat(new Date(Date.UTC(parsed.year, parsed.month - 1, 15, 12)), MONTH_LABEL_PATTERN) : monthKey;
}

async function remindOne(
  target: IEmployeeTarget,
  user: NotifyUser,
  day: string,
  graceDays: number,
  link: string
): Promise<boolean> {
  const id = String(target._id);
  if (!(await claim(id, day))) return false;
  const month = monthLabel(target.month);
  const endDay = windowEndDayKey(target.month, { graceDays });
  const dueOn = endDay ? appDate(middayOf(endDay)) : '';
  const by = dueOn ? ` by ${dueOn}` : '';
  await notificationService
    .create({
      scope: 'USER',
      target_user_ids: [String(target.employee.user_id)],
      title: 'Submit your monthly target progress',
      body: `Share your completion percentage and achievements for ${month}${by}.`,
      link_url: link,
      silent: false,
    })
    .catch((error: unknown) => logs.server.warn('employee-target-reminder', 'inApp', { error, id }));
  await EmployeeTargetModel.updateOne(
    { _id: target._id },
    { $set: { 'reminders.last_sent_on': day }, $inc: { 'reminders.count': 1 } }
  );
  const to = user.auth?.email || target.employee.email || '';
  if (!to) return true;
  await sendEmail({
    to,
    subject: `Submit your target progress for ${month}`,
    template: EMPLOYEE_TARGET_REMINDER_TEMPLATE,
    category: 'internal',
    vars: { name: recipientName(user), month, due_on: dueOn, goal_count: String(target.goals?.length ?? 0), targets_url: link },
  });
  return true;
}

/**
 * Remind each employee whose month is still unsubmitted, once a day, while the
 * month-end window is open (Targets > Settings: the last N days of the month
 * and the first M of the next). In-app and email only — staff are never sent
 * work reminders on WhatsApp (see staffAlert.ts).
 */
export async function runEmployeeTargetReminders(now: Date = new Date()): Promise<number> {
  const window = await employeeTargetSettingsService.window();
  const day = todayKey(now);
  const months = reminderMonthsFor(day, window);
  if (months.length === 0) return 0;
  const targets = await EmployeeTargetModel.find({
    live: true,
    status: 'ASSIGNED',
    month: { $in: months },
    'reminders.last_sent_on': { $ne: day },
  }).lean<IEmployeeTarget[]>();
  if (targets.length === 0) return 0;
  // Only accounts still active: a leaver is not chased for a month they will not finish.
  const users = await UserModel.find({
    _id: { $in: targets.map((t) => t.employee.user_id) },
    'metadata.status': 'ACTIVE',
  })
    .select(NOTIFY_USER_FIELDS)
    .lean<(NotifyUser & { _id: Types.ObjectId })[]>();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  const link = myTargetsUrl();
  let sent = 0;
  for (const target of targets) {
    const user = byId.get(String(target.employee.user_id));
    if (!user) continue;
    try {
      // eslint-disable-next-line no-await-in-loop -- one claim + send per employee, in order
      if (await remindOne(target, user, day, window.graceDays, link)) sent += 1;
    } catch (error) {
      logs.server.error('employee-target-reminder', 'remind', { error, id: String(target._id) });
    }
  }
  return sent;
}

/** Start the reminder loop on the scheduler leader. A no-op under NODE_ENV=test. */
export function startEmployeeTargetReminderScheduler(): () => void {
  return startClusterJob({
    component: 'employee-target-reminder',
    operation: 'sweep',
    firstDelayMs: FIRST_SWEEP_DELAY_MS,
    intervalMs: SWEEP_INTERVAL_MS,
    run: () => runEmployeeTargetReminders(),
  });
}
