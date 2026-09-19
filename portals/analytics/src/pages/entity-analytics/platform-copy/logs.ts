import type { PageCopy } from './types';

/** Each log by name, for the two "by log" charts. */
const SOURCES: Record<string, string> = {
  telemetry: 'analytics.slice.logSrcTelemetry',
  rate_limit: 'analytics.slice.logSrcRateLimit',
  openai: 'analytics.slice.logSrcOpenai',
  ai_monitoring: 'analytics.slice.logSrcAiMonitoring',
  email: 'analytics.slice.logSrcEmail',
  whatsapp: 'analytics.slice.logSrcWhatsapp',
  payment: 'analytics.slice.logSrcPayment',
  refund: 'analytics.slice.logSrcRefund',
  gift_card: 'analytics.slice.logSrcGiftCard',
  coin: 'analytics.slice.logSrcCoin',
  policy: 'analytics.slice.logSrcPolicy',
  pod_audit: 'analytics.slice.logSrcPodAudit',
};

const FAILED = 'analytics.slice.logFailed';
const SKIPPED = 'analytics.slice.logSkipped';
const PENDING = 'analytics.slice.logPending';
const SENT = 'analytics.slice.logSent';

/** Tech > Logs — also the Logs console's home. */
export const LOGS_COPY: PageCopy = {
  kpis: {
    log_entries: { title: 'analytics.kpi.logEntries', hint: 'analytics.kpi.logEntriesHint' },
    log_problems: { title: 'analytics.kpi.logProblems', hint: 'analytics.kpi.logProblemsHint' },
    log_problem_rate: { title: 'analytics.kpi.logProblemRate', hint: 'analytics.kpi.logProblemRateHint' },
    log_telemetry: { title: 'analytics.kpi.logTelemetry', hint: 'analytics.kpi.logTelemetryHint' },
    log_rate_limit: { title: 'analytics.kpi.logRateLimit', hint: 'analytics.kpi.logRateLimitHint' },
    log_openai: { title: 'analytics.kpi.logOpenai', hint: 'analytics.kpi.logOpenaiHint' },
    log_ai_monitoring: { title: 'analytics.kpi.logAiMonitoring', hint: 'analytics.kpi.logAiMonitoringHint' },
    log_email: { title: 'analytics.kpi.logEmail', hint: 'analytics.kpi.logEmailHint' },
    log_whatsapp: { title: 'analytics.kpi.logWhatsapp', hint: 'analytics.kpi.logWhatsappHint' },
    log_payment: { title: 'analytics.kpi.logPayment', hint: 'analytics.kpi.logPaymentHint' },
    log_refund: { title: 'analytics.kpi.logRefund', hint: 'analytics.kpi.logRefundHint' },
    log_gift_card: { title: 'analytics.kpi.logGiftCard', hint: 'analytics.kpi.logGiftCardHint' },
    log_coin: { title: 'analytics.kpi.logCoin', hint: 'analytics.kpi.logCoinHint' },
    log_policy: { title: 'analytics.kpi.logPolicy', hint: 'analytics.kpi.logPolicyHint' },
    log_pod_audit: { title: 'analytics.kpi.logPodAudit', hint: 'analytics.kpi.logPodAuditHint' },
  },
  trends: {
    log_volume: { title: 'analytics.trend.logVolume', hint: 'analytics.trend.logVolumeHint' },
    log_tech: { title: 'analytics.trend.logTech', hint: 'analytics.trend.logTechHint' },
    log_ai: { title: 'analytics.trend.logAi', hint: 'analytics.trend.logAiHint' },
    log_comms: { title: 'analytics.trend.logComms', hint: 'analytics.trend.logCommsHint' },
    log_money: { title: 'analytics.trend.logMoney', hint: 'analytics.trend.logMoneyHint' },
    log_ledgers: { title: 'analytics.trend.logLedgers', hint: 'analytics.trend.logLedgersHint' },
    log_trust: { title: 'analytics.trend.logTrust', hint: 'analytics.trend.logTrustHint' },
  },
  series: {
    log_telemetry_errors: 'analytics.series.logTelemetryErrors',
    log_openai_failed: 'analytics.series.logOpenaiFailed',
    log_sends_failed: 'analytics.series.logSendsFailed',
    log_payment_failed: 'analytics.series.logPaymentFailed',
    log_pod_high_risk: 'analytics.series.logPodHighRisk',
  },
  breakdowns: {
    log_by_source: 'analytics.breakdown.logBySource',
    log_problems_by_source: 'analytics.breakdown.logProblemsBySource',
    log_telemetry_status: 'analytics.breakdown.logTelemetryStatus',
    log_rate_limit_status: 'analytics.breakdown.logRateLimitStatus',
    log_openai_status: 'analytics.breakdown.logOpenaiStatus',
    log_ai_monitoring_status: 'analytics.breakdown.logAiMonitoringStatus',
    log_email_status: 'analytics.breakdown.logEmailStatus',
    log_whatsapp_status: 'analytics.breakdown.logWhatsappStatus',
    log_payment_status: 'analytics.breakdown.logPaymentStatus',
    log_refund_status: 'analytics.breakdown.logRefundStatus',
    log_gift_card_status: 'analytics.breakdown.logGiftCardStatus',
    log_coin_status: 'analytics.breakdown.logCoinStatus',
    log_policy_status: 'analytics.breakdown.logPolicyStatus',
    log_pod_audit_status: 'analytics.breakdown.logPodAuditStatus',
  },
  slices: {
    log_by_source: SOURCES,
    log_problems_by_source: SOURCES,
    log_telemetry_status: {
      error: 'analytics.slice.logLevelError',
      warn: 'analytics.slice.logLevelWarn',
      info: 'analytics.slice.logLevelInfo',
      debug: 'analytics.slice.logLevelDebug',
    },
    log_rate_limit_status: {
      ENFORCE: 'analytics.slice.logBlocked',
      MONITOR: 'analytics.slice.logMonitored',
    },
    log_openai_status: { SUCCESS: 'analytics.slice.logSucceeded', FAILED, SKIPPED },
    log_ai_monitoring_status: { PENDING, COMPLETED: 'analytics.slice.logCompleted', FAILED, SKIPPED },
    log_email_status: { SENT, SKIPPED, FAILED },
    log_whatsapp_status: { SENDING: 'analytics.slice.logSending', SENT, SKIPPED, FAILED },
    log_payment_status: {
      PENDING,
      SUCCESS: 'analytics.slice.logPaid',
      FAILED,
      REFUNDED: 'analytics.slice.logRefunded',
    },
    log_refund_status: {
      REFUNDED: 'analytics.slice.logFullRefund',
      SUCCESS: 'analytics.slice.logPartialRefund',
    },
    log_gift_card_status: { ISSUE: 'analytics.slice.logIssued', REDEEM: 'analytics.slice.logRedeemed' },
    log_coin_status: { CREDIT: 'analytics.slice.logCredited', DEBIT: 'analytics.slice.logDebited' },
    log_policy_status: {
      SIGNUP_FORM: 'analytics.slice.logSignupForm',
      GOOGLE_SIGNUP: 'analytics.slice.logGoogleSignup',
      APPLE_SIGNUP: 'analytics.slice.logAppleSignup',
      ACCOUNT: 'analytics.slice.logAccount',
    },
    log_pod_audit_status: {
      PENDING: 'analytics.slice.logRiskPending',
      LOW: 'analytics.slice.logRiskLow',
      MEDIUM: 'analytics.slice.logRiskMedium',
      HIGH: 'analytics.slice.logRiskHigh',
    },
  },
  leaderboards: {},
  columns: {},
};
