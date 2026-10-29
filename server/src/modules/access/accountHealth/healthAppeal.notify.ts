import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { sendEmail } from '@services/email/email.service';
import { loadNotifyRecipients, recipientName } from '@services/notify/notify.recipients';
import { trimTrailingSlash } from '@utils/url';
import { accountHealthService } from './accountHealth.service';
import type { IHealthAppeal } from './healthAppeal.model';

/** The screen the person filed from: their account health, or that venue's. */
const healthPath = (appeal: IHealthAppeal) =>
  appeal.subject_type === 'VENUE' ? `/venues/${String(appeal.subject_id)}/health` : '/account/health';

/** What the score is called in the message — "account health", or the venue's. */
const healthName = (appeal: IHealthAppeal) =>
  appeal.subject_type === 'VENUE' ? `health for ${appeal.subject_label}` : 'account health';

/**
 * Tell the person what Legal decided about their appeal.
 *
 * In-app (with push) and email, both for the same reason: the person is
 * waiting on an answer about their own standing, and either channel alone is
 * one they may not look at. Not WhatsApp — a template there has to be created
 * and approved in the Communications Portal first.
 *
 * Accepted says the score it is back to, read after the waive, so the number
 * is the one their screen will show. Denied carries Legal's note, because "no"
 * without the reason is not an answer. Never throws: the verdict already stands.
 */
export async function notifyHealthAppealDecided(appeal: IHealthAppeal): Promise<void> {
  try {
    const accepted = appeal.status === 'ACCEPTED';
    const [users, { mwebUrl }, score] = await Promise.all([
      loadNotifyRecipients([appeal.appellant_id]),
      getUrlConfigs(),
      accountHealthService.scoreOf(appeal.subject_type, String(appeal.subject_id)),
    ]);
    const appellantId = String(appeal.appellant_id);
    const points = Math.abs(appeal.delta);
    const what = healthName(appeal);
    const note = appeal.decision_note.trim();
    const path = healthPath(appeal);

    await notificationService
      .create({
        scope: 'USER',
        target_user_ids: [appellantId],
        title: accepted ? 'Appeal accepted' : 'Appeal not accepted',
        body: accepted
          ? `We lifted the ${points}-point deduction. Your ${what} is back to ${score.total_score}/100.`
          : `The ${points}-point deduction on your ${what} stays.${note ? ` ${note}` : ''}`,
        link_url: path,
        silent: false,
      })
      .catch((error: unknown) => logs.server.warn('healthAppeal', 'inApp', { error }));

    const recipient = users.get(appellantId);
    const to = recipient?.auth?.email?.trim() ?? '';
    if (!to) return;
    const appealNo = appeal.appeal_no ?? '';
    await sendEmail({
      to,
      subject: accepted ? `Your appeal was accepted — ${appealNo}` : `About your appeal — ${appealNo}`,
      template: accepted ? 'health-appeal-accepted' : 'health-appeal-denied',
      category: 'legal',
      vars: {
        name: recipientName(recipient),
        appeal_no: appealNo,
        points: String(points),
        remark: appeal.remark || '—',
        score: `${score.total_score} / 100`,
        note: note || '—',
        health_url: `${trimTrailingSlash(mwebUrl)}${path}`,
      },
    });
  } catch (error) {
    logs.server.error('healthAppeal', 'notifyHealthAppealDecided', { appeal_no: appeal.appeal_no, error });
  }
}
