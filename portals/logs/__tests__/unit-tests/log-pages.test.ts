import { describe, expect, it, vi } from 'vitest';

/**
 * The Logs console owns no page of its own: log-pages.ts is the one place that
 * names which console's page each log is. Every source is a stand-in naming
 * itself, so a name pointed at the wrong console's page shows up here.
 */
const page = vi.hoisted(() => (name: string) => () => ({ default: `page:${name}` }));

vi.mock('../../../tests/src/pages/telemetry-logs-page', page('tests/telemetry-logs'));
vi.mock('../../../tests/src/pages/telemetry-log-detail-page', page('tests/telemetry-log-detail'));
vi.mock('../../../tests/src/pages/error-logs-page', page('tests/error-logs'));

vi.mock('../../../tech/src/pages/rate-limiting/blocked', page('tech/rate-limit-blocked'));
vi.mock('../../../tech/src/pages/msg91-settings', page('tech/msg91-settings'));

vi.mock('../../../ai/src/pages/openai-logs', page('ai/openai-logs'));
vi.mock('../../../ai/src/pages/ai-monitoring/logs', page('ai/ai-monitoring-logs'));

vi.mock('../../../communications/src/pages/email-logs-page', page('communications/email-logs'));
vi.mock('../../../communications/src/pages/msg91-otp/logs', page('communications/msg91-logs'));
vi.mock('../../../communications/src/pages/whatsapp-page/wa-logs', page('communications/wa-logs'));
vi.mock('../../../communications/src/pages/whatsapp-page/useWaCampaignActions', () => ({
  useWaCampaignActions: 'hook:useWaCampaignActions',
}));
vi.mock('../../../communications/src/pages/whatsapp-page/useLogCampaignParam', () => ({
  useLogCampaignParam: 'hook:useLogCampaignParam',
}));

vi.mock('../../../finance/src/pages/finance/payment-logs-page/PaymentLogsPage', page('finance/payment-logs'));
vi.mock('../../../finance/src/pages/finance/payment-detail-page', page('finance/payment-detail'));
vi.mock('../../../finance/src/pages/finance/user-refund-logs-page', page('finance/user-refund-logs'));
vi.mock('../../../loyalty/src/pages/gift-cards/virtual/GiftCardLogsPage', page('loyalty/gift-card-logs'));
vi.mock('../../../loyalty/src/pages/duncit-coin/CoinTransactionsPage', page('loyalty/coin-transactions'));
vi.mock('../../../loyalty/src/pages/duncit-coin/CoinTransactionDetailPage', page('loyalty/coin-transaction-detail'));

vi.mock('../../../legal/src/pages/policy-acceptance-logs-page', page('legal/policy-acceptance-logs'));

vi.mock('@duncit/entity-consoles', () => ({ PodMonitoringPage: 'page:entity-consoles/pod-monitoring' }));

vi.mock('../../../analytics/src/pages/entity-analytics/EntityAnalyticsPage', page('analytics/entity-analytics'));
vi.mock('../../../analytics/src/pages/entity-analytics/pages', () => ({ LOGS_PAGE: { entity: 'LOGS' } }));

import * as logPages from '../../src/log-pages';

describe('log-pages', () => {
  it('borrows the telemetry logs from the Tests console', () => {
    expect(logPages.TelemetryLogsPage).toBe('page:tests/telemetry-logs');
    expect(logPages.TelemetryLogDetailPage).toBe('page:tests/telemetry-log-detail');
    expect(logPages.ErrorLogsPage).toBe('page:tests/error-logs');
  });

  it('borrows each Tech log from the Tech console', () => {
    expect(logPages.RateLimitBlockedPage).toBe('page:tech/rate-limit-blocked');
    expect(logPages.Msg91SettingsPage).toBe('page:tech/msg91-settings');
  });

  it('borrows the AI logs from the AI console', () => {
    expect(logPages.OpenAiLogsPage).toBe('page:ai/openai-logs');
    expect(logPages.AiMonitoringLogsPage).toBe('page:ai/ai-monitoring-logs');
  });

  it('borrows the message logs and the WhatsApp log parts from the Communications console', () => {
    expect(logPages.EmailLogsPage).toBe('page:communications/email-logs');
    expect(logPages.Msg91LogsPage).toBe('page:communications/msg91-logs');
    expect(logPages.WaLogs).toBe('page:communications/wa-logs');
    expect(logPages.useWaCampaignActions).toBe('hook:useWaCampaignActions');
    expect(logPages.useLogCampaignParam).toBe('hook:useLogCampaignParam');
  });

  it('borrows the money logs from the Finance console', () => {
    expect(logPages.PaymentLogsPage).toBe('page:finance/payment-logs');
    expect(logPages.PaymentDetailPage).toBe('page:finance/payment-detail');
    expect(logPages.UserRefundLogsPage).toBe('page:finance/user-refund-logs');
  });

  it('borrows the coin and gift card ledgers from the Loyalty console', () => {
    expect(logPages.GiftCardLogsPage).toBe('page:loyalty/gift-card-logs');
    expect(logPages.CoinTransactionsPage).toBe('page:loyalty/coin-transactions');
    expect(logPages.CoinTransactionDetailPage).toBe('page:loyalty/coin-transaction-detail');
  });

  it('borrows policy acceptance from Legal, pod monitoring from the directory consoles, and the dashboard from Analytics', () => {
    expect(logPages.PolicyAcceptanceLogsPage).toBe('page:legal/policy-acceptance-logs');
    expect(logPages.PodMonitoringPage).toBe('page:entity-consoles/pod-monitoring');
    expect(logPages.EntityAnalyticsPage).toBe('page:analytics/entity-analytics');
    expect(logPages.LOGS_PAGE).toEqual({ entity: 'LOGS' });
  });

  it('exports nothing else', () => {
    expect(Object.keys(logPages).sort()).toEqual(
      [
        'AiMonitoringLogsPage',
        'CoinTransactionDetailPage',
        'CoinTransactionsPage',
        'EmailLogsPage',
        'EntityAnalyticsPage',
        'ErrorLogsPage',
        'GiftCardLogsPage',
        'LOGS_PAGE',
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
        'WaLogs',
        'useLogCampaignParam',
        'useWaCampaignActions',
      ].sort(),
    );
  });
});
