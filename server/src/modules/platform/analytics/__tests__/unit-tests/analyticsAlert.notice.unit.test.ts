jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn() }));
jest.mock('@services/email/email-i18n', () => ({ recipientLocale: jest.fn() }));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { findOne: jest.fn() } }));
jest.mock('@modules/finance/finance/finance.model', () => ({ getFinanceSettings: jest.fn() }));
jest.mock('@modules/platform/slack/slack.service', () => ({ slackService: { send: jest.fn() } }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));
jest.mock('../../mail/analyticsMail.copy', () => ({
  copySegment: (key: string) => key.replaceAll(/_([a-z\d])/g, (_m, c: string) => c.toUpperCase()),
  reportCopy: jest.fn(),
}));
jest.mock('../../mail/analyticsMail.pages', () => ({
  ANALYTICS_MAIL_PAGES: { PODS: { path: '/pods', copy: 'pods' } },
  analyticsConsoleUrl: (path: string) => `https://console.test${path}`,
}));

import { sendEmail } from '@services/email/email.service';
import { recipientLocale } from '@services/email/email-i18n';
import { UserModel } from '@modules/access/user/user.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { slackService } from '@modules/platform/slack/slack.service';
import { logs } from '@observability/log';
import { reportCopy } from '../../mail/analyticsMail.copy';
import { notifyTripped, type TrippedAlert } from '../../alerts/analyticsAlert.notice';

const m = (fn: unknown) => fn as jest.Mock;

const tripped = (over: Partial<TrippedAlert> = {}, alert: Record<string, unknown> = {}): TrippedAlert => ({
  alert: {
    _id: 'a1',
    name: 'Cancels',
    entity: 'PODS',
    condition: 'ABOVE',
    threshold: 8,
    days: 30,
    emails: ['ops@example.com'],
    slack: false,
    ...alert,
  } as never,
  kpi: { key: 'cancel_rate', value: 12, previous: 10, format: 'PERCENT', higher_is_better: false },
  change: 20,
  detailsUrl: null,
  ...over,
});

const user = (first: string | undefined | Error) => {
  const lean = first instanceof Error ? jest.fn().mockRejectedValue(first) : jest.fn().mockResolvedValue(
    first === undefined ? null : { profile: { first_name: first } }
  );
  m(UserModel.findOne).mockReturnValue({ select: () => ({ lean }) });
};

beforeEach(() => {
  jest.clearAllMocks();
  m(getFinanceSettings).mockResolvedValue({ currency_symbol: 'Rs' });
  m(recipientLocale).mockResolvedValue('hi');
  m(reportCopy).mockResolvedValue({
    locale: 'hi',
    t: (key: string, vars?: Record<string, string | number>) =>
      vars ? `${key}|${JSON.stringify(vars)}` : key,
  });
  m(sendEmail).mockResolvedValue(undefined);
  m(slackService.send).mockResolvedValue(undefined);
  user('Asha');
});

describe('notifyTripped', () => {
  it('mails each address in its own language with the greeting, rule and a console link', async () => {
    expect(await notifyTripped(tripped())).toBe(true);
    expect(recipientLocale).toHaveBeenCalledWith('ops@example.com');
    expect(reportCopy).toHaveBeenCalledWith('hi');
    const mail = m(sendEmail).mock.calls[0][0];
    expect(mail).toMatchObject({
      to: 'ops@example.com',
      template: 'analytics-alert',
      category: 'internal',
      locale: 'hi',
    });
    expect(mail.subject).toContain('email.analyticsAlert.subject');
    expect(mail.vars).toMatchObject({
      recipient_name: 'Asha',
      alert_name: 'Cancels',
      value_label: '12%',
      details_url: 'https://console.test/pods',
      period_label: expect.stringContaining('"days":30'),
    });
    expect(mail.vars.rule_label).toBe('email.analyticsAlert.ruleAbove|{"threshold":"8%"}');
    expect(mail.vars.change_label).toContain('"change":"+20%"');
    expect(slackService.send).not.toHaveBeenCalled();
  });

  it('greets by address when the reader has no profile or the lookup fails', async () => {
    user(undefined);
    await notifyTripped(tripped());
    expect(m(sendEmail).mock.calls[0][0].vars.recipient_name).toBe('ops@example.com');
    user(new Error('db'));
    await notifyTripped(tripped());
    expect(m(sendEmail).mock.calls[1][0].vars.recipient_name).toBe('ops@example.com');
  });

  it('writes a change rule in percent and a falling change with a minus sign', async () => {
    await notifyTripped(
      tripped(
        { change: -35.5, detailsUrl: 'https://console.test/custom' },
        { condition: 'FALLS_BY', threshold: 30 }
      )
    );
    const vars = m(sendEmail).mock.calls[0][0].vars;
    expect(vars.rule_label).toBe('email.analyticsAlert.ruleFallsBy|{"threshold":"30%"}');
    expect(vars.change_label).toContain('"change":"-35.5%"');
    expect(vars.details_url).toBe('https://console.test/custom');
  });

  it('says there is nothing to compare with for a live count', async () => {
    await notifyTripped(tripped({ change: null }));
    expect(m(sendEmail).mock.calls[0][0].vars.change_label).toBe('email.analyticsAlert.noChange');
  });

  it('posts one Slack message in the default language when asked, even with no addresses', async () => {
    expect(await notifyTripped(tripped({}, { emails: [], slack: true }))).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(reportCopy).toHaveBeenCalledWith(null);
    expect(m(slackService.send).mock.calls[0][0].text).toContain('email.analyticsAlert.slack');
    expect(m(slackService.send).mock.calls[0][0].text).toContain('Cancels');
  });

  it('still counts as told when one address fails, and logs the failure', async () => {
    m(sendEmail).mockRejectedValueOnce(new Error('smtp')).mockResolvedValueOnce(undefined);
    const ok = await notifyTripped(tripped({}, { emails: ['a@example.com', 'b@example.com'] }));
    expect(ok).toBe(true);
    expect(logs.server.error).toHaveBeenCalledTimes(1);
  });

  it('is not told when every send fails', async () => {
    m(sendEmail).mockRejectedValue(new Error('smtp'));
    m(slackService.send).mockRejectedValue(new Error('slack'));
    expect(await notifyTripped(tripped({}, { slack: true }))).toBe(false);
    expect(logs.server.error).toHaveBeenCalledTimes(2);
  });
});
