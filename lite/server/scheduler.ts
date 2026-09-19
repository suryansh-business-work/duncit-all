import { LiteEventModel } from './models/event.model';
import { discoverService } from './services/discover.service';
import { notifications } from './services/notifications';
import { settingsService } from './services/settings.service';
import { log } from './utils/log';

const TICK_MS = 5 * 60_000;

/**
 * Reminder emails: for each configured "hours before", every published event
 * whose start falls inside that window and has not had that reminder yet.
 * The sent hours are stamped on the event, so a restart never repeats one.
 */
async function sendReminders(): Promise<void> {
  const settings = await settingsService.get();
  if (!settings.reminders_enabled) return;
  const now = Date.now();
  for (const hours of settings.reminder_hours_before ?? []) {
    const windowEnd = new Date(now + hours * 3_600_000);
    const due = await LiteEventModel.find({ status: 'PUBLISHED', start_at: { $gt: new Date(now), $lte: windowEnd }, reminders_sent: { $ne: hours } }).limit(50);
    for (const event of due) {
      event.reminders_sent.push(hours);
      await event.save();
      const sent = await notifications.reminder(event, hours);
      log.info('scheduler', 'reminder', { event: event.slug, hours, sent });
    }
  }
}

export function startScheduler(): void {
  const tick = async () => {
    try {
      await sendReminders();
      await discoverService.refreshGoingCounts();
    } catch (error) {
      log.error('scheduler', 'tick', { error });
    }
  };
  setTimeout(tick, 15_000);
  setInterval(tick, TICK_MS);
}
