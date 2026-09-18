import { sendEmail } from '@services/email/email.service';
import { recipientLocale } from '@services/email/email-i18n';
import { UserModel } from '@modules/access/user/user.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { slackService } from '@modules/platform/slack/slack.service';
import { logs } from '@observability/log';
import type { AnalyticsFormat, AnalyticsKpi } from '../entity/shapes';
import { reportCopy, copySegment, type ReportCopy } from '../mail/analyticsMail.copy';
import { formatAnalyticsValue } from '../mail/analyticsMail.format';
import { ANALYTICS_MAIL_PAGES, analyticsConsoleUrl } from '../mail/analyticsMail.pages';
import type { AnalyticsAlertCondition, IAnalyticsAlert } from './analyticsAlert.model';

/**
 * Telling people an alert tripped: the `analytics-alert` mail to every address
 * on it (Tech > Email Templates holds the MJML), each in the reader's
 * language, and one Slack post to the default channel when the alert asks.
 */

/** What the check found, as the notice needs it. */
export interface TrippedAlert {
  alert: IAnalyticsAlert;
  kpi: AnalyticsKpi & { url?: string | null };
  /** The change against the period before, in %; null for a live count. */
  change: number | null;
  /** The console page behind the number — the tile's own, else its dashboard's. */
  detailsUrl: string | null;
}

const RULE_KEYS: Record<AnalyticsAlertCondition, string> = {
  ABOVE: 'email.analyticsAlert.ruleAbove',
  BELOW: 'email.analyticsAlert.ruleBelow',
  RISES_BY: 'email.analyticsAlert.ruleRisesBy',
  FALLS_BY: 'email.analyticsAlert.ruleFallsBy',
};

/** A value line compares in the tile's own units; a change line compares in %. */
const thresholdFormat = (alert: IAnalyticsAlert, format: AnalyticsFormat): AnalyticsFormat =>
  alert.condition === 'ABOVE' || alert.condition === 'BELOW' ? format : 'PERCENT';

function signed(change: number): string {
  const text = formatAnalyticsValue(Math.abs(change), 'PERCENT', '');
  return change < 0 ? `-${text}` : `+${text}`;
}

/** Every line of the notice, in `copy`'s language. */
function noticeVars(tripped: TrippedAlert, copy: ReportCopy, currency: string) {
  const { alert, kpi, change } = tripped;
  const page = ANALYTICS_MAIL_PAGES[alert.entity as keyof typeof ANALYTICS_MAIL_PAGES];
  const threshold = formatAnalyticsValue(alert.threshold, thresholdFormat(alert, kpi.format), currency);
  return {
    alert_name: alert.name,
    tile_label: copy.t('email.analyticsAlert.tile', {
      tile: copy.t(`analytics.kpi.${copySegment(kpi.key)}`),
      dashboard: copy.t(`analytics.page.${page.copy}.title`),
    }),
    value_label: formatAnalyticsValue(kpi.value, kpi.format, currency),
    rule_label: copy.t(RULE_KEYS[alert.condition], { threshold }),
    change_label:
      change === null
        ? copy.t('email.analyticsAlert.noChange')
        : copy.t('email.analyticsAlert.change', { change: signed(change) }),
    period_label: copy.t('email.analyticsSubscribed.periodValue', { days: alert.days }),
    details_url: tripped.detailsUrl ?? analyticsConsoleUrl(page.path),
  };
}

/** The reader's first name on Duncit, else their address — the greeting is never empty. */
async function recipientName(email: string): Promise<string> {
  const user = await UserModel.findOne({ 'auth.email': email })
    .select('profile.first_name')
    .lean<{ profile?: { first_name?: string } }>()
    .catch(() => null);
  return user?.profile?.first_name || email;
}

async function mailOne(email: string, tripped: TrippedAlert, currency: string): Promise<void> {
  const locale = await recipientLocale(email);
  const [copy, name] = await Promise.all([reportCopy(locale), recipientName(email)]);
  await sendEmail({
    to: email,
    subject: copy.t('email.analyticsAlert.subject', { name: tripped.alert.name }),
    template: 'analytics-alert',
    category: 'internal',
    locale,
    vars: { ...noticeVars(tripped, copy, currency), recipient_name: name },
  });
}

async function postToSlack(tripped: TrippedAlert, currency: string): Promise<void> {
  const copy = await reportCopy(null);
  const vars = noticeVars(tripped, copy, currency);
  await slackService.send({
    text: copy.t('email.analyticsAlert.slack', {
      name: vars.alert_name,
      tile: vars.tile_label,
      value: vars.value_label,
      rule: vars.rule_label,
      period: vars.period_label,
      url: vars.details_url,
    }),
  });
}

/** Mails everyone on the alert and posts to Slack if asked; true when anyone was told. */
export async function notifyTripped(tripped: TrippedAlert): Promise<boolean> {
  const { currency_symbol: currency } = await getFinanceSettings();
  const sends = tripped.alert.emails.map((email) => mailOne(email, tripped, currency));
  if (tripped.alert.slack) sends.push(postToSlack(tripped, currency));
  const results = await Promise.allSettled(sends);
  for (const result of results) {
    if (result.status === 'rejected') {
      logs.server.error('analytics-alert', 'notify', { error: result.reason, alert: String(tripped.alert._id) });
    }
  }
  return results.some((result) => result.status === 'fulfilled');
}
