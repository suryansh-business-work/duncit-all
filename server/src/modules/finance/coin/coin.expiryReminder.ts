import type { Types } from 'mongoose';
import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { startClusterJob } from '@utils/clusterJob';
import { appDate } from '@utils/app-time';
import { trimTrailingSlash } from '@utils/url';
import { EmailClaimModel } from '@modules/content/emailLog/emailClaim.model';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { sendEmail } from '@services/email/email.service';
import { loadNotifyRecipients, recipientName } from '@services/notify/notify.recipients';
import { CoinTransactionModel } from './coin.model';
import { coinSettingsService } from './coin.settings.service';

const DAY_MS = 24 * 60 * 60_000;
const SWEEP_INTERVAL_MS = 30 * 60_000;
const FIRST_SWEEP_DELAY_MS = 4 * 60_000;
/** Three ticks wide; the claim below stops the overlap from reminding twice. */
const WINDOW_MS = 3 * SWEEP_INTERVAL_MS;

interface DueBatch {
  _id: { user_id: Types.ObjectId; expires_at: Date };
  coins: number;
}

/** MongoServerError 11000 — somebody already claimed this reminder. */
const isDuplicate = (error: unknown) => (error as { code?: number })?.code === 11000;

/** Once per member per expiry date, however many ticks see the batch. */
async function claim(userId: string, expiresAt: Date): Promise<boolean> {
  try {
    await EmailClaimModel.create({ key: `COIN_EXPIRY_REMINDER|${userId}|${expiresAt.getTime()}` });
    return true;
  } catch (error) {
    if (isDuplicate(error)) return false;
    throw error;
  }
}

/**
 * Remind members a few days before their unspent coins lapse.
 *
 * Coins used to disappear on their date with nothing said; the reminder is the
 * one message that turns a lost balance into a booking. In-app (with push) and
 * email — never WhatsApp, whose marketing messages people did not opt into for
 * this. The lead is Finance > Duncit Coin > "Remind before expiry"; 0 is off.
 */
export async function runCoinExpiryReminders(now = Date.now()): Promise<void> {
  const days = await coinSettingsService.expiryReminderDays();
  if (days <= 0) return;
  const edge = now + days * DAY_MS;
  const batches = await CoinTransactionModel.aggregate<DueBatch>([
    {
      $match: {
        remaining: { $gt: 0 },
        expires_at: { $gt: new Date(edge - WINDOW_MS), $lte: new Date(edge) },
      },
    },
    { $group: { _id: { user_id: '$user_id', expires_at: '$expires_at' }, coins: { $sum: '$remaining' } } },
  ]);
  if (batches.length === 0) return;
  const [users, { mwebUrl }] = await Promise.all([
    loadNotifyRecipients(batches.map((batch) => batch._id.user_id)),
    getUrlConfigs(),
  ]);
  const walletUrl = `${trimTrailingSlash(mwebUrl)}/duncit-coin`;
  for (const batch of batches) {
    const userId = batch._id.user_id.toString();
    const expiresOn = appDate(batch._id.expires_at);
    // eslint-disable-next-line no-await-in-loop -- one claim per member, sequential
    if (!(await claim(userId, batch._id.expires_at))) continue;
    // eslint-disable-next-line no-await-in-loop -- in-app first, then the email
    await notificationService
      .create({
        scope: 'USER',
        target_user_ids: [userId],
        title: 'Your coins expire soon',
        body: `${batch.coins} Duncit Coins expire on ${expiresOn}. Use them on a pod or in the shop before then.`,
        silent: false,
      })
      .catch((error: unknown) => logs.server.warn('coin-expiry', 'reminderInApp', { error }));
    const user = users.get(userId);
    const to = user?.auth?.email ?? '';
    if (!to) continue;
    // eslint-disable-next-line no-await-in-loop -- one email per member
    await sendEmail({
      to,
      subject: `${batch.coins} Duncit Coins expire on ${expiresOn}`,
      template: 'coin-expiry-reminder',
      category: 'notification',
      vars: { name: recipientName(user), coins: String(batch.coins), expires_on: expiresOn, wallet_url: walletUrl },
    });
  }
}

/** Start the reminder loop on the scheduler leader. A no-op under NODE_ENV=test. */
export function startCoinExpiryReminderScheduler(): () => void {
  return startClusterJob({
    component: 'coin-expiry-reminder',
    operation: 'sweep',
    firstDelayMs: FIRST_SWEEP_DELAY_MS,
    intervalMs: SWEEP_INTERVAL_MS,
    run: () =>
      runCoinExpiryReminders().catch((error) => {
        logs.server.error('coin-expiry-reminder', 'sweep', { error });
      }),
  });
}
