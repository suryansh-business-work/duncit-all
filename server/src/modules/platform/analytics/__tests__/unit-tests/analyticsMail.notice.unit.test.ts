jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn() }));
jest.mock('@services/email/email-i18n', () => ({ recipientLocale: jest.fn() }));
jest.mock('@utils/app-time', () => ({ getAppTimeZone: () => 'Asia/Kolkata' }));
jest.mock('../../mail/analyticsMail.copy', () => ({ reportCopy: jest.fn() }));
jest.mock('../../mail/analyticsMail.pages', () => ({
  ANALYTICS_MAIL_PAGES: { PODS: { path: '/pods', copy: 'pods' }, REVENUE: { path: '/revenue', copy: 'revenue' } },
  analyticsConsoleUrl: () => 'https://console.test/',
}));

import { sendEmail } from '@services/email/email.service';
import { recipientLocale } from '@services/email/email-i18n';
import { reportCopy } from '../../mail/analyticsMail.copy';
import { sendSubscribedNotice } from '../../mail/analyticsMail.notice';

const m = (fn: unknown) => fn as jest.Mock;

const copyIn = (locale: string) => ({
  locale,
  t: (key: string, vars?: Record<string, string | number>) => (vars ? `${key}|${JSON.stringify(vars)}` : key),
});
const sub = (over: Record<string, unknown> = {}) =>
  ({ email: 'ops@example.com', name: 'Ops', pages: ['PODS', 'REVENUE'], frequency: 'DAILY', days: 30, ...over }) as never;
const settings = (over: Record<string, unknown> = {}) =>
  ({ enabled: true, time_of_day: '09:00', weekday: 1, ...over }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  m(recipientLocale).mockResolvedValue('en');
  m(reportCopy).mockResolvedValue(copyIn('en'));
  m(sendEmail).mockResolvedValue(undefined);
});

const vars = () => m(sendEmail).mock.calls[0][0].vars;

describe('sendSubscribedNotice', () => {
  it('tells a daily subscriber the dashboards, the period and the time', async () => {
    await sendSubscribedNotice(sub(), settings());
    expect(m(sendEmail).mock.calls[0][0]).toMatchObject({
      to: 'ops@example.com',
      template: 'analytics-subscribed',
      category: 'internal',
      locale: 'en',
    });
    expect(vars()).toMatchObject({
      name: 'Ops',
      dashboards_label: 'analytics.page.pods.title, analytics.page.revenue.title',
      analytics_url: 'https://console.test/',
    });
    expect(vars().schedule_label).toBe(
      'email.analyticsSubscribed.scheduleDaily|{"time":"09:00","zone":"Asia/Kolkata"}'
    );
    expect(vars().period_label).toContain('"days":30');
  });

  it('names the weekday in the reader language for a weekly subscriber', async () => {
    m(reportCopy).mockResolvedValue(copyIn('hi'));
    await sendSubscribedNotice(sub({ frequency: 'WEEKLY' }), settings({ weekday: 1 }));
    const label = vars().schedule_label as string;
    expect(label).toContain('scheduleWeekly');
    // Monday in Hindi, not the English fallback
    expect(label).toContain('सोमवार');
  });

  it('falls back to English weekday names for a locale Intl rejects', async () => {
    m(reportCopy).mockResolvedValue(copyIn('not a locale!!'));
    await sendSubscribedNotice(sub({ frequency: 'WEEKLY' }), settings({ weekday: 0 }));
    expect(vars().schedule_label).toContain('Sunday');
  });

  it('says the schedule is paused when the whole mail is switched off', async () => {
    await sendSubscribedNotice(sub(), settings({ enabled: false }));
    expect(vars().schedule_label).toBe('email.analyticsSubscribed.schedulePaused');
  });
});
