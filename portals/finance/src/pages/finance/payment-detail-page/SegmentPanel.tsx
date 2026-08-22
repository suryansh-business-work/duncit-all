import { useMemo } from 'react';
import { Alert, Stack } from '@mui/material';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import ArtifactsTable from './ArtifactsTable';
import StepsTimeline from './StepsTimeline';
import PodBookingCard from './PodBookingCard';
import ProductOrdersTable from './ProductOrdersTable';
import GiftCardBlock from './GiftCardBlock';
import { inSegment, segmentApplies, type CheckoutTab } from './checkout-segments';
import type { PaymentDetail, PaymentSegment } from './queries';

interface DomainProps {
  detail: PaymentDetail;
  segment: PaymentSegment;
  formatDateTime: DateFormatter['formatDateTime'];
}

/** What this tab's purchase actually was, ahead of the audit rows about it.
 * Hoisted to module scope: a component declared inside its parent is a new type
 * on every render and remounts the whole block. */
function DomainBlock({ detail, segment, formatDateTime }: Readonly<DomainProps>) {
  const symbol = detail.payment.currency_symbol;
  if (segment === 'POD') {
    if (!detail.pod_booking) return null;
    return <PodBookingCard booking={detail.pod_booking} formatDateTime={formatDateTime} />;
  }
  if (segment === 'PRODUCT') {
    if (detail.product_orders.length === 0) return null;
    return <ProductOrdersTable orders={detail.product_orders} currencySymbol={symbol} />;
  }
  if (!detail.gift_card) return null;
  return (
    <GiftCardBlock card={detail.gift_card} currencySymbol={symbol} formatDateTime={formatDateTime} />
  );
}

interface Props {
  detail: PaymentDetail;
  tab: CheckoutTab;
  busyKey: string | null;
  onRetry: (stepKey: string) => void;
  formatDateTime: DateFormatter['formatDateTime'];
}

/** One checkout stream: what it bought, what it created, and how it got there. */
export default function SegmentPanel({
  detail,
  tab,
  busyKey,
  onRetry,
  formatDateTime,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // Memoised because the artifacts table watches this array's identity to know
  // when a re-run rewrote its rows — a fresh slice per render would make it
  // refetch on every render instead.
  const artifacts = useMemo(
    () => inSegment(detail.artifacts, tab.segment),
    [detail.artifacts, tab.segment],
  );
  const steps = useMemo(() => inSegment(detail.steps, tab.segment), [detail.steps, tab.segment]);

  if (!segmentApplies(detail.artifacts, tab.segment)) {
    return <Alert severity="info">{t(tab.emptyKey)}</Alert>;
  }

  return (
    <Stack spacing={2.5}>
      <DomainBlock detail={detail} segment={tab.segment} formatDateTime={formatDateTime} />
      <ArtifactsTable
        artifacts={artifacts}
        tableId={`finance-payment-artifacts-${tab.value}`}
        busyKey={busyKey}
        onRetry={onRetry}
      />
      <StepsTimeline
        steps={steps}
        busyKey={busyKey}
        onRetry={onRetry}
        formatDateTime={formatDateTime}
      />
    </Stack>
  );
}
