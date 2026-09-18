/**
 * Every page this console borrows, imported here and nowhere else.
 *
 * The Logs console owns no log of its own: each entry in its sidebar is the
 * owning console's page, mounted as it is. One implementation, two mounts — a
 * copy would be a second table to drift from the first the next time a column
 * or a filter changes (rules 34/40). The directory consoles already live in a
 * package, so Pod Monitoring comes from there; the rest are read straight from
 * their console's source, which is why the Dockerfile copies those `src`
 * folders and the deploy filter rebuilds this console when they change.
 *
 * What a page READS, the server opens to LOGS_MANAGER (`LOGS_READER` in
 * server/src/middleware/rbac.ts). What it WRITES stays with its console.
 */

// Tech
export { default as TelemetryLogsPage } from '../../tech/src/pages/telemetry-logs-page';
export { default as TelemetryLogDetailPage } from '../../tech/src/pages/telemetry-log-detail-page';
export { default as ErrorLogsPage } from '../../tech/src/pages/error-logs-page';
export { default as RateLimitBlockedPage } from '../../tech/src/pages/rate-limiting/blocked';

// AI
export { default as OpenAiLogsPage } from '../../ai/src/pages/openai-logs';
export { default as AiMonitoringLogsPage } from '../../ai/src/pages/ai-monitoring/logs';

// Communications — WhatsApp's log is a tab of its console there, so the parts
// are borrowed and ./pages/whatsapp-logs assembles them into a page.
export { default as EmailLogsPage } from '../../communications/src/pages/email-logs-page';
export { default as Msg91LogsPage } from '../../communications/src/pages/msg91-otp/logs';
export { default as WaLogs } from '../../communications/src/pages/whatsapp-page/wa-logs';
export { useWaCampaignActions } from '../../communications/src/pages/whatsapp-page/useWaCampaignActions';
export { useLogCampaignParam } from '../../communications/src/pages/whatsapp-page/useLogCampaignParam';
export type { WaAudienceList } from '../../communications/src/pages/whatsapp-page/queries';

// Finance
export { default as PaymentLogsPage } from '../../finance/src/pages/finance/payment-logs-page/PaymentLogsPage';
export { default as PaymentDetailPage } from '../../finance/src/pages/finance/payment-detail-page';
export { default as UserRefundLogsPage } from '../../finance/src/pages/finance/user-refund-logs-page';
export { default as GiftCardLogsPage } from '../../finance/src/pages/finance/gift-cards/GiftCardLogsPage';
export { default as CoinTransactionsPage } from '../../finance/src/pages/finance/duncit-coin/CoinTransactionsPage';

// Legal
export { default as PolicyAcceptanceLogsPage } from '../../legal/src/pages/policy-acceptance-logs-page';

// Pods
export { PodMonitoringPage } from '@duncit/entity-consoles';
