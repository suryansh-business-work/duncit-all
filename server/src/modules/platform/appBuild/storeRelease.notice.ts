import { logs } from '@observability/log';
import { sendEmail } from '@services/email/email.service';
import { recipientLocale } from '@services/email/email-i18n';
import { postMessage } from '@modules/platform/slack/slack.gateway';
import { reportCopy, type ReportCopy } from '@modules/platform/analytics/mail/analyticsMail.copy';
import { getUrlConfigs } from '@config/url-configs';
import { appDate, appTime } from '@utils/app-time';
import { clip, escapeMrkdwn } from '@utils/slack-blocks';
import type { IStoreReleaseIssue, IStoreReleaseSettings, ReleaseStore } from './storeRelease.model';

/**
 * Telling people a release needs them: a mail to every address in the release
 * settings (Tech > Email Templates holds the MJML), each in the reader's
 * language, and one short Slack post to the chosen channel. The same pair goes
 * out again as a reminder while the issue stays open.
 *
 * Best-effort throughout. The issue is the record; this only repeats it, so a
 * mail provider down or a channel the bot has not joined is logged on the
 * issue and never stops the page or the sync.
 */

export type NoticeMode = 'NEW' | 'REMINDER';

const RELEASES_PATH = '/app-builds/releases';
const HOUR_MS = 3_600_000;

const STORE_KEY: Record<ReleaseStore, string> = {
  APP_STORE: 'email.storeRelease.storeAppStore',
  GOOGLE_PLAY: 'email.storeRelease.storeGooglePlay',
};

/** The store's word, readable: METADATA_REJECTED → "Metadata rejected"; production/completed stays. */
export const humanState = (state: string): string => {
  if (!/^[A-Z_]+$/.test(state)) return state;
  const words = state.toLowerCase().replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** The copy key explaining a state, when the catalogue has one; a generic line otherwise. */
const MEANING_KEY: Record<string, string> = {
  REJECTED: 'email.storeRelease.meaningRejected',
  METADATA_REJECTED: 'email.storeRelease.meaningMetadataRejected',
  INVALID_BINARY: 'email.storeRelease.meaningInvalidBinary',
  DEVELOPER_REJECTED: 'email.storeRelease.meaningDeveloperRejected',
  PENDING_DEVELOPER_RELEASE: 'email.storeRelease.meaningPendingDeveloperRelease',
  MANUAL: 'email.storeRelease.meaningManual',
};

const meaningOf = (issue: IStoreReleaseIssue, copy: ReportCopy): string =>
  copy.t(MEANING_KEY[issue.state] ?? 'email.storeRelease.meaningOther', { state: humanState(issue.state) });

/** How long the issue has been open, in whole hours. */
export const hoursOpen = (issue: IStoreReleaseIssue): number =>
  Math.max(0, Math.floor((Date.now() - issue.detected_at.getTime()) / HOUR_MS));

const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** The advice as the mail's own HTML block: a paragraph, then the causes and the steps as lists. */
function adviceHtml(issue: IStoreReleaseIssue, copy: ReportCopy): string {
  const { advice } = issue;
  if (!advice.summary) return `<p>${esc(advice.error || copy.t('email.storeRelease.noAdvice'))}</p>`;
  const section = (titleKey: string, items: string[]) => {
    if (!items.length) return '';
    const lines = items.map((item) => `<li>${esc(item)}</li>`).join('');
    return `<p><strong>${esc(copy.t(titleKey))}</strong></p><ul>${lines}</ul>`;
  };
  return [
    `<p>${esc(advice.summary)}</p>`,
    section('email.storeRelease.causesLabel', advice.causes),
    section('email.storeRelease.stepsLabel', advice.steps),
    section('email.storeRelease.nextTimeLabel', advice.next_time),
  ].join('');
}

function noticeVars(issue: IStoreReleaseIssue, copy: ReportCopy, releasesUrl: string) {
  const detected = issue.detected_at;
  return {
    store_label: copy.t(STORE_KEY[issue.store]),
    version: issue.version || '—',
    build_number: issue.build_number || '—',
    state_label: humanState(issue.state),
    meaning: meaningOf(issue, copy),
    reviewer_message: issue.reviewer_message || copy.t('email.storeRelease.noReviewerMessage'),
    detected_label: `${appDate(detected)} ${appTime(detected)}`,
    hours_open: String(hoursOpen(issue)),
    advice_summary: issue.advice.summary || copy.t('email.storeRelease.noAdvice'),
    advice_html: adviceHtml(issue, copy),
    releases_url: releasesUrl,
  };
}

const TEMPLATE: Record<NoticeMode, Record<IStoreReleaseIssue['kind'], string>> = {
  NEW: { REJECTION: 'store-release-rejected', AWAITING_RELEASE: 'store-release-approved' },
  REMINDER: { REJECTION: 'store-release-reminder', AWAITING_RELEASE: 'store-release-reminder' },
};

const SUBJECT_KEY: Record<NoticeMode, Record<IStoreReleaseIssue['kind'], string>> = {
  NEW: { REJECTION: 'email.storeRelease.subjectRejected', AWAITING_RELEASE: 'email.storeRelease.subjectApproved' },
  REMINDER: { REJECTION: 'email.storeRelease.subjectReminder', AWAITING_RELEASE: 'email.storeRelease.subjectReminder' },
};

const SLACK_KEY: Record<NoticeMode, Record<IStoreReleaseIssue['kind'], string>> = {
  NEW: { REJECTION: 'email.storeRelease.slackRejected', AWAITING_RELEASE: 'email.storeRelease.slackApproved' },
  REMINDER: { REJECTION: 'email.storeRelease.slackReminder', AWAITING_RELEASE: 'email.storeRelease.slackReminder' },
};

async function mailOne(to: string, issue: IStoreReleaseIssue, mode: NoticeMode, releasesUrl: string): Promise<void> {
  const locale = await recipientLocale(to);
  const copy = await reportCopy(locale);
  const vars = noticeVars(issue, copy, releasesUrl);
  await sendEmail({
    to,
    subject: copy.t(SUBJECT_KEY[mode][issue.kind], { store: vars.store_label, version: vars.version }),
    template: TEMPLATE[mode][issue.kind],
    category: 'internal',
    locale,
    vars: { ...vars, recipient_name: to },
  });
}

/** One short post: what happened, the suggestion in a line, the link. */
async function postSlack(channel: string, issue: IStoreReleaseIssue, mode: NoticeMode, releasesUrl: string): Promise<void> {
  const copy = await reportCopy(null);
  const vars = noticeVars(issue, copy, releasesUrl);
  const text = copy.t(SLACK_KEY[mode][issue.kind], {
    store: escapeMrkdwn(vars.store_label),
    version: escapeMrkdwn(vars.version),
    build: escapeMrkdwn(vars.build_number),
    state: escapeMrkdwn(vars.state_label),
    hours: vars.hours_open,
    suggestion: escapeMrkdwn(clip(vars.advice_summary, 600)),
    url: releasesUrl,
  });
  await postMessage({ channel, text, unfurl_links: false });
}

/** Mail everyone in the settings and post to the channel; the issue records that it happened, or why not. */
export async function notifyIssue(
  issue: IStoreReleaseIssue,
  settings: IStoreReleaseSettings,
  mode: NoticeMode
): Promise<void> {
  const releasesUrl = `${(await getUrlConfigs()).techUrl}${RELEASES_PATH}`;
  const sends = settings.mail_to.map((to) => mailOne(to, issue, mode, releasesUrl));
  if (settings.slack_channel) sends.push(postSlack(settings.slack_channel, issue, mode, releasesUrl));
  const results = await Promise.allSettled(sends);
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  for (const failure of failures) {
    logs.server.error('appBuild', 'releaseNotice', { error: failure.reason, issue: issue.id, mode });
  }
  const error = failures.map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason))).join(' · ');
  const now = new Date();
  const $set: Record<string, unknown> =
    mode === 'NEW'
      ? { notified_at: now, notify_error: clip(error, 500) }
      : { last_reminded_at: now, notify_error: clip(error, 500) };
  const update = mode === 'NEW' ? { $set } : { $set, $inc: { reminder_count: 1 } };
  await issue.updateOne(update);
}
