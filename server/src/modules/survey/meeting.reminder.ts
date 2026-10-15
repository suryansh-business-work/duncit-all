import { startClusterJob } from '@utils/clusterJob';
import { logs } from '@observability/log';
import { sendEmail } from '@services/email/email.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { loadNotifyRecipients, recipientName } from '@services/notify/notify.recipients';
import { MeetingAvailabilityModel, MeetingModel } from './meeting.model';
import { DEFAULT_MEETING_REMINDER_LEAD_HOURS, slotPartsTz } from './meeting.service';

const HOUR_MS = 60 * 60_000;
const SWEEP_INTERVAL_MS = 10 * 60_000;
const FIRST_SWEEP_DELAY_MS = 120_000;
/** Three ticks wide, so one missed tick cannot step over a meeting. The claim
 * below is what stops the overlap from sending twice. */
const WINDOW_MS = 3 * SWEEP_INTERVAL_MS;

/** One WhatsApp key per partner kind, all on the same campaign — so the
 * Automation board files each under its own audience. */
const REMINDER_EVENT: Record<string, string> = {
  HOST: 'HOST_ONBOARDING_REMINDER',
  VENUE: 'VENUE_ONBOARDING_REMINDER',
  ECOMM: 'ECOMM_ONBOARDING_REMINDER',
  CLUB_ADMIN: 'CLUB_ADMIN_ONBOARDING_REMINDER',
};

/** What the reminder says when staff have not added the call link yet. */
const LINK_PENDING = 'shared by our team before the call';

/**
 * Claim the reminder for THIS slot. A meeting moved to a new time is a new
 * slot and earns a new reminder; the same slot is reminded once however many
 * ticks see it.
 */
async function claim(meetingId: unknown, scheduledAt: Date): Promise<boolean> {
  const result = await MeetingModel.updateOne(
    { _id: meetingId, status: 'SCHEDULED', reminded_for: { $ne: scheduledAt } },
    { $set: { reminded_for: scheduledAt } }
  );
  return result.modifiedCount === 1;
}

/**
 * Remind every applicant whose onboarding call is coming up.
 *
 * Applicants booked a slot days ahead and heard nothing more until the call —
 * so they missed it, and a no-show cost a whole interview slot somebody else
 * could have had. The lead is the Onboarding portal's own setting
 * (Meetings > Availability); 0 switches it off.
 */
export async function runMeetingReminders(now = Date.now()): Promise<void> {
  const av = await MeetingAvailabilityModel.findOne().lean();
  const leadHours = av?.reminder_lead_hours ?? DEFAULT_MEETING_REMINDER_LEAD_HOURS;
  if (leadHours <= 0) return;
  const edge = now + leadHours * HOUR_MS;
  const meetings = await MeetingModel.find({
    status: 'SCHEDULED',
    scheduled_at: { $gt: new Date(now), $gte: new Date(edge - WINDOW_MS), $lte: new Date(edge) },
  })
    .select('kind user_id scheduled_at meeting_link reminded_for')
    .lean();
  if (meetings.length === 0) return;
  const users = await loadNotifyRecipients(meetings.map((meeting) => meeting.user_id));
  const offset = av?.timezone_offset_minutes ?? 330;
  for (const meeting of meetings) {
    const scheduledAt = meeting.scheduled_at as Date;
    // eslint-disable-next-line no-await-in-loop -- one claim per meeting, sequential like every other sweep
    if (!(await claim(meeting._id, scheduledAt))) continue;
    const user = users.get(String(meeting.user_id)) ?? null;
    const name = recipientName(user);
    const when = slotPartsTz(scheduledAt.toISOString(), offset);
    const link = meeting.meeting_link || LINK_PENDING;
    // eslint-disable-next-line no-await-in-loop -- AiSensy rate-limits; one at a time
    await Promise.all([
      user?.auth?.email
        ? sendEmail({
            to: user.auth.email,
            subject: `Reminder: your Duncit onboarding call on ${when.date}`,
            template: 'meeting-reminder',
            category: 'notification',
            vars: { name, date: when.date, time: when.time, meeting_link: link },
          })
        : null,
      whatsappService.send({
        event: REMINDER_EVENT[meeting.kind] ?? REMINDER_EVENT.HOST,
        entityId: `${String(meeting._id)}:${scheduledAt.getTime()}`,
        user,
        name,
        params: [name, when.date, when.time, link],
      }),
    ]);
  }
}

/** Start the reminder loop on the scheduler leader. A no-op under NODE_ENV=test. */
export function startMeetingReminderScheduler(): () => void {
  return startClusterJob({
    component: 'meeting-reminder',
    operation: 'sweep',
    firstDelayMs: FIRST_SWEEP_DELAY_MS,
    intervalMs: SWEEP_INTERVAL_MS,
    run: () =>
      runMeetingReminders().catch((error) => {
        logs.server.error('meeting-reminder', 'sweep', { error });
      }),
  });
}
