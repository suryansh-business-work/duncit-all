jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn() }));
jest.mock('@services/email/email-i18n', () => ({ recipientLocale: jest.fn() }));
jest.mock('@modules/finance/finance/finance.model', () => ({ getFinanceSettings: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));
jest.mock('../../mail/analyticsMail.model', () => ({ AnalyticsMailSubscriptionModel: { updateOne: jest.fn() } }));
jest.mock('../../mail/analyticsMail.copy', () => ({ reportCopy: jest.fn() }));
jest.mock('../../mail/analyticsMail.report', () => ({ buildReport: jest.fn(), cachedBoards: jest.fn(() => jest.fn()) }));
jest.mock('../../mail/analyticsMail.html', () => ({ reportHtml: jest.fn(() => '<p>html</p>') }));
jest.mock('../../mail/analyticsMail.pdf', () => ({ analyticsReportPdf: jest.fn() }));
jest.mock('../../mail/analyticsMail.summary', () => ({ summarizeReport: jest.fn() }));

import { sendEmail } from '@services/email/email.service';
import { recipientLocale } from '@services/email/email-i18n';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { logs } from '@observability/log';
import { AnalyticsMailSubscriptionModel } from '../../mail/analyticsMail.model';
import { reportCopy } from '../../mail/analyticsMail.copy';
import { buildReport } from '../../mail/analyticsMail.report';
import { analyticsReportPdf } from '../../mail/analyticsMail.pdf';
import { summarizeReport } from '../../mail/analyticsMail.summary';
import { sendAnalyticsReport, sendContext } from '../../mail/analyticsMail.send';

const m = (fn: unknown) => fn as jest.Mock;
const NOW = new Date('2026-03-15T06:00:00Z');
const FINANCE = { currency_symbol: 'Rs', business_name: 'Duncit', invoice_logo_url: 'https://cdn.test/logo.png' };

const sub = (over: Record<string, unknown> = {}) =>
  ({
    _id: 's1',
    email: 'ops@example.com',
    name: 'Ops',
    pages: ['PODS'],
    days: 30,
    frequency: 'DAILY',
    ai_summary: false,
    ...over,
  }) as never;

const lastWrite = () => m(AnalyticsMailSubscriptionModel.updateOne).mock.calls.at(-1)?.[1].$set;

beforeEach(() => {
  jest.clearAllMocks();
  m(getFinanceSettings).mockResolvedValue(FINANCE);
  m(recipientLocale).mockResolvedValue('en');
  m(reportCopy).mockResolvedValue({ locale: 'en', t: (k: string) => k });
  m(buildReport).mockResolvedValue({ title: 'Daily', period: '30 days', url: 'https://c.test', sections: [{}, {}] });
  m(analyticsReportPdf).mockResolvedValue(Buffer.from('pdf'));
  m(summarizeReport).mockResolvedValue({ headline: 'h', highlights: [], concerns: [], watch: [] });
  m(sendEmail).mockResolvedValue({ accepted: ['ops@example.com'] });
  m(AnalyticsMailSubscriptionModel.updateOne).mockReturnValue({ exec: () => Promise.resolve({}) });
});

describe('sendAnalyticsReport', () => {
  it('mails the report with the PDF attached and records SENT', async () => {
    const out = await sendAnalyticsReport(sub(), sendContext(), NOW);
    expect(out).toEqual({ status: 'SENT', reason: '' });
    const mail = m(sendEmail).mock.calls[0][0];
    expect(mail).toMatchObject({
      to: 'ops@example.com',
      template: 'analytics-report',
      subject: 'Daily — 30 days',
    });
    expect(mail.vars).toMatchObject({ dashboards_count: '2', analytics_html: '<p>html</p>', analytics_url: 'https://c.test' });
    expect(mail.attachments[0]).toMatchObject({
      filename: 'duncit-analytics-2026-03-15.pdf',
      contentType: 'application/pdf',
    });
    expect(m(buildReport).mock.calls[0][0]).toMatchObject({ title: 'email.analyticsReport.dailyTitle', currency: 'Rs' });
    expect(m(analyticsReportPdf).mock.calls[0][0]).toMatchObject({ brandName: 'Duncit', recipient: 'Ops', summary: null });
    expect(lastWrite()).toEqual({ last_sent_at: NOW, last_status: 'SENT', last_error: '' });
    expect(summarizeReport).not.toHaveBeenCalled();
  });

  it('uses the weekly title for a weekly subscriber', async () => {
    await sendAnalyticsReport(sub({ frequency: 'WEEKLY' }), sendContext(), NOW);
    expect(m(buildReport).mock.calls[0][0].title).toBe('email.analyticsReport.weeklyTitle');
  });

  it('writes one AI summary for identical reports across subscribers', async () => {
    const ctx = sendContext();
    await sendAnalyticsReport(sub({ ai_summary: true }), ctx, NOW);
    await sendAnalyticsReport(sub({ ai_summary: true, email: 'b@example.com' }), ctx, NOW);
    expect(summarizeReport).toHaveBeenCalledTimes(1);
    expect(m(analyticsReportPdf).mock.calls[1][0].summary).toMatchObject({ headline: 'h' });
    // one language lookup per locale for the run
    expect(reportCopy).toHaveBeenCalledTimes(1);
  });

  it('records SKIPPED when the mailer declined on purpose, FAILED otherwise', async () => {
    m(sendEmail).mockResolvedValueOnce({ accepted: [], skipped: true, reason: 'unsubscribed' });
    expect(await sendAnalyticsReport(sub(), sendContext(), NOW)).toEqual({ status: 'SKIPPED', reason: 'unsubscribed' });
    m(sendEmail).mockResolvedValueOnce({ accepted: [] });
    expect(await sendAnalyticsReport(sub(), sendContext(), NOW)).toEqual({ status: 'FAILED', reason: '' });
  });

  it('never throws: records FAILED with the error text and logs', async () => {
    m(buildReport).mockRejectedValue(new Error('boom'));
    expect(await sendAnalyticsReport(sub(), sendContext(), NOW)).toEqual({ status: 'FAILED', reason: 'boom' });
    expect(lastWrite()).toMatchObject({ last_status: 'FAILED', last_error: 'boom' });
    expect(logs.server.error).toHaveBeenCalled();
    m(buildReport).mockRejectedValue('weird');
    expect((await sendAnalyticsReport(sub(), sendContext(), NOW)).reason).toBe('weird');
  });

  it('falls back to the default language for a recipient with no stored locale', async () => {
    m(recipientLocale).mockResolvedValue(null);
    await sendAnalyticsReport(sub(), sendContext(), NOW);
    expect(reportCopy).toHaveBeenCalledWith(null);
    expect(m(sendEmail).mock.calls[0][0].locale).toBeNull();
  });

  it('defaults the send time to now', async () => {
    await sendAnalyticsReport(sub(), sendContext());
    expect(lastWrite().last_sent_at).toBeInstanceOf(Date);
  });
});
