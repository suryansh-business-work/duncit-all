jest.mock('@modules/ai/prompt/prompt.service', () => ({ resolvePrompt: jest.fn() }));
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn(), warn: jest.fn() } } }));

import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { logs } from '@observability/log';
import { summarizeReport } from '../../mail/analyticsMail.summary';
import type { AnalyticsReport } from '../../mail/analyticsMail.report';

const m = (fn: unknown) => fn as jest.Mock;

const report = {
  title: 'Daily report',
  period: 'Last 30 days',
  generated: '',
  url: '',
  sections: [
    {
      entity: 'PODS',
      title: 'Pods',
      url: '',
      table: null,
      error: null,
      kpis: [{ title: 'Pods held', value: '12', change: '+10%', tone: 'good' }],
    },
    { entity: 'SONAR', title: 'Sonar', url: '', table: null, kpis: [], error: 'Not connected' },
  ],
} as unknown as AnalyticsReport;

const answer = (content: unknown) => m(openaiChat).mockResolvedValue({ ok: true, content: JSON.stringify(content) });

beforeEach(() => {
  jest.clearAllMocks();
  m(resolvePrompt).mockImplementation(async (key: string) => ({ model: 'm1', content: `prompt:${key}` }));
});

describe('summarizeReport', () => {
  it('sends only what the tiles say, in the reader language, and keeps the trimmed answer', async () => {
    answer({
      headline: '  Pods are up  ',
      highlights: ['a', '  ', 7, 'b', 'c', 'd', 'e'],
      concerns: 'not an array',
      watch: ['w'],
    });
    const out = await summarizeReport(report, 'hi');
    expect(out).toEqual({ headline: 'Pods are up', highlights: ['a', 'b', 'c', 'd'], concerns: [], watch: ['w'] });

    const [, userCall] = m(resolvePrompt).mock.calls;
    expect(userCall[0]).toBe('analytics.report_summary.user');
    const data = JSON.parse(userCall[1].report_data);
    expect(data.language).toBe('hi');
    expect(data.dashboards).toEqual([
      { title: 'Pods', tiles: [{ title: 'Pods held', value: '12', change: '+10%', tone: 'good' }] },
      { title: 'Sonar', error: 'Not connected' },
    ]);
    expect(m(openaiChat).mock.calls[0][0]).toMatchObject({ json: true, model: 'm1', detail: 'Daily report' });
  });

  it('gives no summary when the AI is unavailable, and logs why', async () => {
    m(openaiChat).mockResolvedValue({ ok: false, code: 'NO_KEY', message: 'unset' });
    expect(await summarizeReport(report, 'en')).toBeNull();
    expect(logs.server.warn).toHaveBeenCalledWith('analytics-mail', 'summary', { code: 'NO_KEY', msg: 'unset' });
  });

  it('gives no summary for an answer without a headline or that is not an object', async () => {
    answer({ headline: '   ', highlights: ['x'] });
    expect(await summarizeReport(report, 'en')).toBeNull();
    answer(null);
    expect(await summarizeReport(report, 'en')).toBeNull();
    answer('plain string');
    expect(await summarizeReport(report, 'en')).toBeNull();
    answer({ headline: 42 });
    expect(await summarizeReport(report, 'en')).toBeNull();
  });

  it('never throws: bad JSON or a failed call is logged and returns null', async () => {
    m(openaiChat).mockResolvedValue({ ok: true, content: '{not json' });
    expect(await summarizeReport(report, 'en')).toBeNull();
    m(openaiChat).mockRejectedValue(new Error('network'));
    expect(await summarizeReport(report, 'en')).toBeNull();
    expect(logs.server.error).toHaveBeenCalledTimes(2);
  });
});
