import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Routes, StaticRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

/** Each borrowed page is a stand-in that names itself, so the table can be read off the markup. */
const PAGES = vi.hoisted(() => [
  'AiMonitoringLogsPage',
  'CoinTransactionsPage',
  'EmailLogsPage',
  'ErrorLogsPage',
  'GiftCardLogsPage',
  'Msg91LogsPage',
  'Msg91SettingsPage',
  'OpenAiLogsPage',
  'PaymentDetailPage',
  'PaymentLogsPage',
  'PodMonitoringPage',
  'PolicyAcceptanceLogsPage',
  'RateLimitBlockedPage',
  'TelemetryLogDetailPage',
  'TelemetryLogsPage',
  'UserRefundLogsPage',
]);

vi.mock('../../src/log-pages', () =>
  Object.fromEntries(PAGES.map((name) => [name, () => <main data-page={name} />])),
);
vi.mock('../../src/pages/whatsapp-logs', () => ({ default: () => <main data-page="WhatsappLogsPage" /> }));

import { logRoutes } from '../../src/routes';

const authed = (element: ReactElement) => <div data-authed="yes">{element}</div>;

const pageAt = (path: string) =>
  renderToStaticMarkup(
    <StaticRouter location={path}>
      <Routes>{logRoutes(authed as never)}</Routes>
    </StaticRouter>,
  );

const TABLE: Array<[string, string]> = [
  ['/telemetry/logs', 'TelemetryLogsPage'],
  ['/telemetry/log/abc123', 'TelemetryLogDetailPage'],
  ['/telemetry/error-logs', 'ErrorLogsPage'],
  ['/rate-limiting/blocked', 'RateLimitBlockedPage'],
  ['/openai/logs', 'OpenAiLogsPage'],
  ['/monitoring', 'AiMonitoringLogsPage'],
  ['/emails/logs', 'EmailLogsPage'],
  ['/whatsapp/logs', 'WhatsappLogsPage'],
  ['/msg91-otp/logs', 'Msg91LogsPage'],
  ['/msg91-otp/settings', 'Msg91SettingsPage'],
  ['/payment-logs', 'PaymentLogsPage'],
  ['/payment-logs/pay_1', 'PaymentDetailPage'],
  ['/user-refund-logs', 'UserRefundLogsPage'],
  ['/gift-cards/logs', 'GiftCardLogsPage'],
  ['/duncit-coin/transactions', 'CoinTransactionsPage'],
  ['/policy-acceptance-logs', 'PolicyAcceptanceLogsPage'],
  ['/pod-monitoring', 'PodMonitoringPage'],
];

describe('logRoutes', () => {
  it.each(TABLE)('serves %s with %s, behind the sign-in wrapper', (path, page) => {
    const html = pageAt(path);
    expect(html).toContain(`data-page="${page}"`);
    expect(html).toContain('data-authed="yes"');
  });

  it('serves exactly one page per address', () => {
    for (const [path] of TABLE) expect(pageAt(path).match(/data-page="/g)).toHaveLength(1);
    expect(TABLE).toHaveLength(17);
  });

  it('serves nothing at an address that is not a log', () => {
    expect(pageAt('/not-a-log')).toBe('');
    expect(pageAt('/telemetry')).toBe('');
  });
});
