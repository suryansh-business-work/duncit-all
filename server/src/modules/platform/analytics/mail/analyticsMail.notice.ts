import { sendEmail } from '@services/email/email.service';
import { recipientLocale } from '@services/email/email-i18n';
import { getAppTimeZone } from '@utils/app-time';
import type { IAnalyticsMailSettings, IAnalyticsMailSubscription } from './analyticsMail.model';
import { ANALYTICS_MAIL_PAGES, analyticsConsoleUrl } from './analyticsMail.pages';
import { reportCopy, type ReportCopy } from './analyticsMail.copy';

/**
 * The mail a new subscriber receives the moment they are added
 * (`analytics-subscribed`): which dashboards, how often, for what period, and
 * the link to read them live — so the first report is not a surprise.
 */

/** 1 Jan 2023 was a Sunday, so day `n` of that week is weekday `n` (0 = Sunday). */
const SUNDAY = Date.UTC(2023, 0, 1);
const DAY_MS = 86_400_000;

/** The weekday's name in the reader's language — `Intl` knows every one, so none is written here. */
function weekdayName(weekday: number, locale: string): string {
  const day = new Date(SUNDAY + weekday * DAY_MS);
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(day);
  } catch {
    // A stored locale Intl does not recognise; English still names the right day.
    return new Intl.DateTimeFormat('en', { weekday: 'long', timeZone: 'UTC' }).format(day);
  }
}

function scheduleLabel(sub: IAnalyticsMailSubscription, settings: IAnalyticsMailSettings, copy: ReportCopy): string {
  if (!settings.enabled) return copy.t('email.analyticsSubscribed.schedulePaused');
  const vars = { time: settings.time_of_day, zone: getAppTimeZone() };
  if (sub.frequency === 'DAILY') return copy.t('email.analyticsSubscribed.scheduleDaily', vars);
  return copy.t('email.analyticsSubscribed.scheduleWeekly', { ...vars, day: weekdayName(settings.weekday, copy.locale) });
}

export async function sendSubscribedNotice(
  sub: IAnalyticsMailSubscription,
  settings: IAnalyticsMailSettings
): Promise<void> {
  const locale = await recipientLocale(sub.email);
  const copy = await reportCopy(locale);
  const dashboards = sub.pages.map((entity) => copy.t(`analytics.page.${ANALYTICS_MAIL_PAGES[entity].copy}.title`));
  await sendEmail({
    to: sub.email,
    subject: copy.t('email.analyticsSubscribed.title'),
    template: 'analytics-subscribed',
    category: 'internal',
    locale,
    vars: {
      name: sub.name,
      schedule_label: scheduleLabel(sub, settings, copy),
      period_label: copy.t('email.analyticsSubscribed.periodValue', { days: sub.days }),
      dashboards_label: dashboards.join(', '),
      analytics_url: analyticsConsoleUrl(),
    },
  });
}
