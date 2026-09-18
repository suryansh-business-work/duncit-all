import { Route } from 'react-router';
import type { createAuthed } from '@duncit/shell';
import {
  AiMonitoringLogsPage,
  CoinTransactionsPage,
  EmailLogsPage,
  ErrorLogsPage,
  GiftCardLogsPage,
  Msg91LogsPage,
  OpenAiLogsPage,
  PaymentDetailPage,
  PaymentLogsPage,
  PodMonitoringPage,
  PolicyAcceptanceLogsPage,
  RateLimitBlockedPage,
  TelemetryLogDetailPage,
  TelemetryLogsPage,
  UserRefundLogsPage,
} from './log-pages';
import WhatsappLogsPage from './pages/whatsapp-logs';

/**
 * Every log Duncit keeps, at the path its own console serves it on. The pages
 * link to each other by those paths (a log row to its detail, a refund to its
 * payment), so keeping them is what keeps those links working here too.
 */
export function logRoutes(authed: ReturnType<typeof createAuthed>) {
  return (
    <>
      <Route path="/telemetry/logs" element={authed(<TelemetryLogsPage />)} />
      <Route path="/telemetry/log/:logId" element={authed(<TelemetryLogDetailPage />)} />
      <Route path="/telemetry/error-logs" element={authed(<ErrorLogsPage />)} />
      <Route path="/rate-limiting/blocked" element={authed(<RateLimitBlockedPage />)} />

      <Route path="/openai/logs" element={authed(<OpenAiLogsPage />)} />
      <Route path="/monitoring" element={authed(<AiMonitoringLogsPage />)} />

      <Route path="/emails/logs" element={authed(<EmailLogsPage />)} />
      <Route path="/whatsapp/logs" element={authed(<WhatsappLogsPage />)} />
      <Route path="/msg91-otp/logs" element={authed(<Msg91LogsPage />)} />

      <Route path="/payment-logs" element={authed(<PaymentLogsPage />)} />
      <Route path="/payment-logs/:id" element={authed(<PaymentDetailPage />)} />
      <Route path="/user-refund-logs" element={authed(<UserRefundLogsPage />)} />
      <Route path="/gift-cards/logs" element={authed(<GiftCardLogsPage />)} />
      <Route path="/duncit-coin/transactions" element={authed(<CoinTransactionsPage />)} />

      <Route path="/policy-acceptance-logs" element={authed(<PolicyAcceptanceLogsPage />)} />

      <Route path="/pod-monitoring" element={authed(<PodMonitoringPage />)} />
    </>
  );
}
