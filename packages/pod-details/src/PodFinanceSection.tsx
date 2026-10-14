import { useQuery } from '@apollo/client/react';
import { Chip, Divider, Stack, Typography } from '@mui/material';
import PaidIcon from '@mui/icons-material/Paid';
import { EarningsSplitView } from '@duncit/ui';
import SectionCard from './SectionCard';
import { POD_FINANCE_BREAKDOWN } from './queries';
import type { Translate } from './i18n/useTranslation';
import { useTranslation } from './i18n/useTranslation';

type SettlementStatus = 'LIVE' | 'PENDING_APPROVAL' | 'SETTLED';

const statusChips = (t: Translate): Record<SettlementStatus, { label: string; color: 'info' | 'warning' | 'success' }> => ({
  LIVE: { label: t('podDetailsPanel.podFinanceSection.live'), color: 'info' },
  PENDING_APPROVAL: { label: t('podDetailsPanel.podFinanceSection.pendingApproval'), color: 'warning' },
  SETTLED: { label: t('podDetailsPanel.podFinanceSection.settled'), color: 'success' },
});

/** One label/value line of the summary above the waterfall. */
function SummaryRow({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        justifyContent: "space-between",
        alignItems: "baseline"
      }}>
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{
        fontWeight: 600
      }}>
        {value}
      </Typography>
    </Stack>
  );
}

/** A FREE pod moves no platform money (its host settles the venue directly),
 * so the card says so instead of printing a split of zeros. */
function FreeFinanceBody({ bookings }: Readonly<{ bookings: number }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.25} data-testid="pod-finance-free">
      <SummaryRow label={t('podDetailsPanel.podFinanceSection.bookings')} value={bookings} />
      <Chip
        size="small"
        color="success"
        variant="outlined"
        label={t('podDetailsPanel.podFinanceSection.freePod')}
        sx={{ alignSelf: 'flex-start' }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('podDetailsPanel.podFinanceSection.freeNote')}
      </Typography>
    </Stack>
  );
}

/** "Finance" card on the pod detail page: settlement status + the pod's money
 * split four ways (host first), the same view every surface shows. */
export default function PodFinanceSection({ podId }: Readonly<{ podId: string }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(POD_FINANCE_BREAKDOWN, {
    variables: { pod_id: podId },
    skip: !podId,
    fetchPolicy: 'cache-and-network',
  });
  const breakdown = data?.podFinanceBreakdown;
  const statusChip = breakdown ? statusChips(t)[breakdown.settlement_status as SettlementStatus] : null;

  return (
    <SectionCard
      icon={<PaidIcon fontSize="small" />}
      title={t('podDetailsPanel.podFinanceSection.finance')}
      tone="success"
      loading={loading && !breakdown}
      error={error ? t('podDetailsPanel.podFinanceSection.breakdownUnavailable') : null}
      empty={
        !error && !loading && !breakdown
          ? t('podDetailsPanel.podFinanceSection.noSettlement')
          : null
      }
      action={
        breakdown && (
          <Stack direction="row" spacing={1}>
            {statusChip && <Chip size="small" label={statusChip.label} color={statusChip.color} />}
            {breakdown.frozen && <Chip size="small" label={t('podDetailsPanel.podFinanceSection.frozenSnapshot')} variant="outlined" />}
          </Stack>
        )
      }
    >
      {breakdown?.is_free && <FreeFinanceBody bookings={breakdown.bookings_count} />}
      {breakdown && !breakdown.is_free && (
        <Stack spacing={1.25}>
          <SummaryRow label={t('podDetailsPanel.podFinanceSection.bookings')} value={breakdown.bookings_count} />
          <SummaryRow
            label={t('podDetailsPanel.podFinanceSection.collectedTotal')}
            value={`${breakdown.currency_symbol}${breakdown.collected_total.toFixed(2)}`}
          />
          {/* Tiers come off the ticket price before anyone pays, so the collected
              total already sits below face value by exactly this much. */}
          {breakdown.ticket_discount_total > 0 && (
            <SummaryRow
              label={t('podDetailsPanel.podFinanceSection.ticketDiscounts')}
              value={`${breakdown.currency_symbol}${breakdown.ticket_discount_total.toFixed(2)}`}
            />
          )}
          {breakdown.refunded_total > 0 && (
            <>
              <SummaryRow
                label={t('podDetailsPanel.podFinanceSection.refunded')}
                value={`${breakdown.currency_symbol}${breakdown.refunded_total.toFixed(2)}`}
              />
              <SummaryRow
                label={t('podDetailsPanel.podFinanceSection.refundedBookings')}
                value={breakdown.refunded_count}
              />
            </>
          )}
          <Divider />
          <EarningsSplitView
            waterfall={breakdown.waterfall}
            symbol={breakdown.currency_symbol}
            viewer="staff"
          />
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {t('podDetailsPanel.podFinanceSection.payoutNote')}
          </Typography>
        </Stack>
      )}
    </SectionCard>
  );
}
