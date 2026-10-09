import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitIconButton } from '@duncit/buttons';
import { EarningsSplitView, QueryGuard } from '@duncit/ui';
import SettlementStatusChip, { FrozenBadge } from './SettlementStatusChip';
import { POD_FINANCE_BREAKDOWN, money, type PodFinanceBreakdown } from './queries';
import { formatDateTime, useTranslation } from '@duncit/app-settings';

function PodFinanceDetail({ breakdown }: Readonly<{ breakdown: PodFinanceBreakdown }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sym = breakdown.currency_symbol;

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          mb: 3
        }}>
        <DuncitIconButton aria-label={t('finance.podFinance.backToPodFinance')} onClick={() => navigate('/pod-finance')}>
          <ArrowBackIcon />
        </DuncitIconButton>
        <Box sx={{ flex: 1 }}>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
              alignItems: "center",
              flexWrap: "wrap"
            }}>
            <Typography component="h1" variant="h5" sx={{
              fontWeight: 700
            }}>{breakdown.pod_title}</Typography>
            <SettlementStatusChip status={breakdown.settlement_status} />
            {breakdown.frozen && <FrozenBadge />}
          </Stack>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {breakdown.bookings_count} bookings · Customer paid {money(sym, breakdown.collected_total)}
            {breakdown.completed_at ? ` · Completed ${formatDateTime(breakdown.completed_at)}` : ''}
          </Typography>
          {/* Coins cut the gross before GST, so "Customer paid" above is lower
              than the tickets' face value by exactly the redeemed figure.
              Saying so is what stops the gap reading as missing money. */}
          {(breakdown.coins_redeemed_total > 0 || breakdown.coins_earned_total > 0) && (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Duncit Coins · {breakdown.coins_redeemed_total} spent on these bookings (already off
              the collected total) · {breakdown.coins_earned_total} earned back by buyers
            </Typography>
          )}
          {/* Tiers come off the ticket price before checkout, so they too explain
              why "Customer paid" sits below the tickets' face value. */}
          {breakdown.ticket_discount_total > 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('finance.podFinance.ticketDiscountsNote', {
                vars: { amount: money(sym, breakdown.ticket_discount_total) },
              })}
            </Typography>
          )}
        </Box>
      </Stack>

      {/* The same four-way split (host first) every surface shows for a pod,
          read straight off the server waterfall that settles it. */}
      <Card variant="outlined" sx={{ borderRadius: 3, maxWidth: 720 }}>
        <CardContent>
          <EarningsSplitView waterfall={breakdown.waterfall} symbol={sym} viewer="staff" />
        </CardContent>
      </Card>
    </Box>
  );
}

export default function PodFinanceDetailPage() {
  const { podId } = useParams<{ podId: string }>();
  const { data, loading, error } = useQuery<{ podFinanceBreakdown: PodFinanceBreakdown }>(
    POD_FINANCE_BREAKDOWN,
    { variables: { podId }, fetchPolicy: 'cache-and-network', skip: !podId },
  );

  const breakdown = data?.podFinanceBreakdown;

  return (
    <QueryGuard
      loading={loading && !breakdown}
      error={error}
      notFound={!breakdown}
      notFoundText="Pod finance breakdown not found."
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => {
        if (!breakdown) return null;
        return <PodFinanceDetail breakdown={breakdown} />;
      }}
    </QueryGuard>
  );
}
