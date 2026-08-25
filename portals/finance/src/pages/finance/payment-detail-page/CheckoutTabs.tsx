import { useMemo } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { useTranslation, type DateFormatter, type Translator } from '@duncit/app-settings';
import SegmentPanel from './SegmentPanel';
import {
  CHECKOUT_TABS,
  defaultCheckoutTab,
  segmentHasFailure,
  type CheckoutTabValue,
} from './checkout-segments';
import type { PaymentArtifact, PaymentDetail } from './queries';

/** One tab per thing a checkout can buy, each flagged when something inside it
 * was never created — so the broken stream is visible without opening all three. */
const buildTabItems = (artifacts: readonly PaymentArtifact[], t: Translator['t']) =>
  CHECKOUT_TABS.map((tab) => ({
    value: tab.value,
    label: t(tab.labelKey),
    icon: segmentHasFailure(artifacts, tab.segment) ? (
      <ErrorOutlineIcon fontSize="small" color="error" />
    ) : undefined,
    iconPosition: 'end' as const,
  }));

interface Props {
  detail: PaymentDetail;
  busyKey: string | null;
  onRetry: (stepKey: string) => void;
  formatDateTime: DateFormatter['formatDateTime'];
}

/**
 * "What checkout created", split the way checkout itself is: a pod seat, a
 * product order and a gift card are three different purchases with three
 * different pipelines behind them, and reading them in one flat list is what
 * made a missing shipment look like a missing ticket.
 */
export default function CheckoutTabs({
  detail,
  busyKey,
  onRetry,
  formatDateTime,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const items = useMemo(() => buildTabItems(detail.artifacts, t), [detail.artifacts, t]);
  // Open on what this payment actually bought rather than always on the pod tab.
  const fallback = useMemo(() => defaultCheckoutTab(detail.artifacts), [detail.artifacts]);
  const tabs = useTabParam<CheckoutTabValue>({ items, fallback });
  const active = CHECKOUT_TABS.find((tab) => tab.value === tabs.value) ?? CHECKOUT_TABS[0];

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, width: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{
          fontWeight: 700
        }}>
          {t('finance.payment.artifactsTitle')}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: "block"
          }}>
          {t('finance.payment.artifactsCaption')}
        </Typography>
        <DuncitTabs
          {...tabs}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}
        />
        <SegmentPanel
          detail={detail}
          tab={active}
          busyKey={busyKey}
          onRetry={onRetry}
          formatDateTime={formatDateTime}
        />
      </CardContent>
    </Card>
  );
}
