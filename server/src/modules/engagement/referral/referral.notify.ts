import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { sendEmail } from '@services/email/email.service';
import { loadNotifyRecipients, recipientName } from '@services/notify/notify.recipients';
import { trimTrailingSlash } from '@utils/url';

/**
 * Tell the person who shared their code that it worked.
 *
 * The coins landed silently, so the one moment that makes somebody share their
 * code a second time — "your friend joined and you earned" — never happened.
 * In-app (with push) and email; not WhatsApp, because a reward notice is not
 * worth a message on a number somebody gave us for their bookings.
 *
 * Only the referrer is told: the new member was shown their own coins on the
 * screen where they typed the code. Never throws — the coins are already paid.
 */
export async function notifyReferrerRewarded(referrerId: string, referredUserId: string, coins: number) {
  if (!(coins > 0)) return;
  try {
    const [users, { mwebUrl }] = await Promise.all([
      loadNotifyRecipients([referrerId, referredUserId]),
      getUrlConfigs(),
    ]);
    const referrer = users.get(referrerId);
    const friend = users.get(referredUserId)?.profile?.first_name?.trim() || 'A friend';
    await notificationService
      .create({
        scope: 'USER',
        target_user_ids: [referrerId],
        title: 'Your referral worked',
        body: `${friend} joined Duncit with your code. You earned ${coins} Duncit Coins.`,
        silent: false,
      })
      .catch((error: unknown) => logs.server.warn('referral', 'rewardInApp', { error }));
    const to = referrer?.auth?.email ?? '';
    if (!to) return;
    await sendEmail({
      to,
      subject: `${friend} joined Duncit with your code`,
      template: 'referral-reward',
      category: 'notification',
      vars: {
        name: recipientName(referrer),
        friend,
        coins: String(coins),
        wallet_url: `${trimTrailingSlash(mwebUrl)}/duncit-coin`,
      },
    });
  } catch (error) {
    logs.server.error('referral', 'notifyReferrerRewarded', { error });
  }
}
