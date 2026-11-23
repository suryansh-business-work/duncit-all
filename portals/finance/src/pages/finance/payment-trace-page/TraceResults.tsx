import { Alert, Stack } from '@mui/material';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import TracePaymentCard from './TracePaymentCard';
import TraceSection from './TraceSection';
import {
  caseEntries,
  eventEntries,
  foodOrderEntries,
  refundEntries,
  shopOrderEntries,
  stepEntries,
  webhookEntries,
} from './traceEntries';
import type { PaymentTrace } from './queries';

interface Props {
  trace: PaymentTrace;
  formatDateTime: DateFormatter['formatDateTime'];
}

/**
 * What one id led to: the payments it belongs to first, then every log it was
 * looked up in. An id found nowhere says so plainly rather than showing a page
 * of empty sections.
 */
export default function TraceResults({ trace, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!trace.found) {
    return (
      <Alert severity="info" data-testid="payment-trace-not-found">
        {t('finance.paymentTrace.notFound', { vars: { ref: trace.ref } })}
      </Alert>
    );
  }
  const sections = [
    { key: 'steps', title: t('finance.paymentTrace.sectionSteps'), entries: stepEntries(t, trace, formatDateTime) },
    { key: 'events', title: t('finance.paymentTrace.sectionEvents'), entries: eventEntries(t, trace, formatDateTime) },
    { key: 'webhooks', title: t('finance.paymentTrace.sectionWebhooks'), entries: webhookEntries(t, trace, formatDateTime) },
    { key: 'cases', title: t('finance.paymentTrace.sectionCases'), entries: caseEntries(t, trace, formatDateTime) },
    { key: 'refunds', title: t('finance.paymentTrace.sectionRefunds'), entries: refundEntries(t, trace, formatDateTime) },
    { key: 'shop', title: t('finance.paymentTrace.sectionShopOrders'), entries: shopOrderEntries(t, trace, formatDateTime) },
    { key: 'food', title: t('finance.paymentTrace.sectionFoodOrders'), entries: foodOrderEntries(t, trace, formatDateTime) },
  ];

  return (
    <Stack spacing={2} data-testid="payment-trace-results">
      {trace.payments.length === 0 && <Alert severity="info">{t('finance.paymentTrace.noPayment')}</Alert>}
      {trace.payments.map((payment) => (
        <TracePaymentCard key={payment.id} payment={payment} formatDateTime={formatDateTime} />
      ))}
      {sections.map((section) => (
        <TraceSection key={section.key} title={section.title} entries={section.entries} testId={`payment-trace-${section.key}`} />
      ))}
    </Stack>
  );
}
