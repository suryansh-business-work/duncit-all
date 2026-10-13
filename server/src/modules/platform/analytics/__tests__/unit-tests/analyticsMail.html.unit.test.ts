import { reportHtml } from '../../mail/analyticsMail.html';
import type { AnalyticsReport } from '../../mail/analyticsMail.report';

const copy = { locale: 'en', t: (key: string) => `[${key}]` };

const report = (sections: unknown[]) =>
  ({ title: 't', period: 'p', generated: 'g', url: 'u', sections }) as unknown as AnalyticsReport;

const section = (over: Record<string, unknown> = {}) => ({
  entity: 'PODS',
  title: 'Pods <b>',
  url: 'https://console.test/pods?a=1&b=2',
  table: null,
  error: null,
  kpis: [{ title: 'Held', value: '12', change: '+10%', tone: 'good' }],
  ...over,
});

describe('reportHtml', () => {
  it('draws each tile with its tone colour and escapes data', () => {
    const html = reportHtml(report([section()]), copy);
    expect(html).toContain('Pods &lt;b&gt;');
    expect(html).not.toContain('Pods <b>');
    expect(html).toContain('https://console.test/pods?a=1&amp;b=2');
    expect(html).toContain('[email.analyticsReport.openDashboard]');
    expect(html).toContain('color:#15803d'); // good
    expect(html).not.toContain('[email.analyticsReport.aiHeading]');
  });

  it('uses red for bad, grey for flat and a live count', () => {
    const html = reportHtml(
      report([
        section({
          kpis: [
            { title: 'A', value: '1', change: 'x', tone: 'bad' },
            { title: 'B', value: '2', change: 'y', tone: 'flat' },
            { title: 'C', value: '3', change: 'z', tone: null },
          ],
        }),
      ]),
      copy
    );
    expect(html).toContain('font-size:12px;color:#b91c1c');
    expect(html.match(/font-size:12px;color:#4b5563/g)).toHaveLength(2);
  });

  it('shows the reason instead of tiles for a dashboard that could not be read', () => {
    const html = reportHtml(report([section({ error: 'Sonar <down>', kpis: [] })]), copy);
    expect(html).toContain('Sonar &lt;down&gt;');
    expect(html).not.toContain('<table');
  });

  it('puts the AI summary first, omitting empty lists', () => {
    const html = reportHtml(report([section()]), copy, {
      headline: 'Up & away',
      highlights: ['one'],
      concerns: [],
      watch: ['two'],
    });
    expect(html.indexOf('aiHeading')).toBeLessThan(html.indexOf('Pods'));
    expect(html).toContain('Up &amp; away');
    expect(html).toContain('[email.analyticsReport.aiHighlights]');
    expect(html).toContain('[email.analyticsReport.aiWatch]');
    expect(html).not.toContain('[email.analyticsReport.aiConcerns]');
    expect(html).toContain('[email.analyticsReport.aiNote]');
  });
});
