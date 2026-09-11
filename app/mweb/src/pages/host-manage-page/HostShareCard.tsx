import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import HostSectionHeader from './HostSectionHeader';
import RowGroup from './RowGroup';
import { useTranslation } from '../../i18n/useTranslation';
import type { Translate } from '../../i18n/fallback';

export const MY_HOST_PAYOUTS = gql`
  query MyHostPayouts {
    myHostPayouts {
      id
      pod_title
      status
      amount_requested
      approved_amount
      breakdown {
        collected_total
        venue_bill
        gst_pct
        gst_amount
        duncit_pct
        duncit_amount
        payout_pct
        payout_amount
        version
        share_amount
        commission_pct
        commission_amount
      }
      created_at
    }
    publicFinanceSettings {
      currency_symbol
    }
  }
`;

type Status = 'PENDING' | 'APPROVED' | 'REJECTED';
const STATUS_COLOR: Record<Status, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

/** v2 (waterfall) breakdowns show the host's pool money − commission; v1 keeps
 * the legacy venue-bill/GST lines. */
function breakdownLines(b: any, t: Translate) {
  if (!b) return [];
  if (b.version >= 2) {
    return [
      { label: t('mweb.hostManage.yourAmount2'), value: b.share_amount },
      {
        label: t('mweb.hostManage.commissionPct', { vars: { pct: b.commission_pct } }),
        value: b.commission_amount,
      },
    ];
  }
  return [
    { label: t('mweb.hostManage.venueBill'), value: b.venue_bill },
    { label: t('mweb.hostManage.gstPct', { vars: { pct: b.gst_pct } }), value: b.gst_amount },
    {
      label: t('mweb.hostManage.duncitTakenPct', { vars: { pct: b.duncit_pct } }),
      value: b.duncit_amount,
    },
  ];
}

function PayoutRow({ payout, symbol }: Readonly<{ payout: any; symbol: string }>) {
  const { t } = useTranslation();
  const b = payout.breakdown;
  const fmt = (n: number) => `${symbol}${(Number(n) || 0).toFixed(2)}`;
  const lines = breakdownLines(b, t);
  const isV2 = (b?.version ?? 0) >= 2;
  const legacyLabel = b
    ? t('mweb.hostManage.yourCommissionPct', { vars: { pct: b.payout_pct } })
    : t('mweb.hostManage.yourCommission');
  const payableLabel = isV2 ? t('mweb.hostManage.payout') : legacyLabel;
  const payable = payout.approved_amount ?? b?.payout_amount ?? payout.amount_requested;
  return (
    <Box sx={{ px: 2, py: 1.75 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          mb: 0.5
        }}>
        <Typography sx={{ flex: 1, fontSize: '0.9375rem', fontWeight: 600 }} noWrap>
          {payout.pod_title}
        </Typography>
        <Chip
          color={STATUS_COLOR[payout.status as Status] ?? 'default'}
          label={payout.status}
          sx={{ height: 24 }}
        />
      </Stack>
      <Stack spacing={0.25}>
        {lines.map((line) => (
          <Stack key={line.label} direction="row" sx={{
            justifyContent: "space-between"
          }}>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {line.label}
            </Typography>
            <Typography variant="caption">{fmt(line.value)}</Typography>
          </Stack>
        ))}
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            mt: 0.25
          }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {payableLabel}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "primary.main",
              fontWeight: 700
            }}>
            {fmt(payable)}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

/** "Host Share" — every completion payout this host has earned, with status. */
export default function HostShareCard() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(MY_HOST_PAYOUTS, { fetchPolicy: 'cache-and-network' });
  const payouts = data?.myHostPayouts ?? [];
  const symbol = data?.publicFinanceSettings?.currency_symbol ?? '₹';

  let body;
  if (loading && !data) {
    body = (
      <Stack
        sx={{
          alignItems: "center",
          py: 3
        }}>
        <CircularProgress size={20} />
      </Stack>
    );
  } else if (error) {
    body = <Alert severity="error" sx={{ m: 2 }}>{error.message}</Alert>;
  } else if (payouts.length === 0) {
    body = (
      <Typography
        variant="body2"
        sx={{ px: 2, py: 2.5, textAlign: 'center', color: 'text.secondary' }}
      >
        {t('mweb.hostManage.completeAPodToSeeYour')}
      </Typography>
    );
  } else {
    body = payouts.map((p: any) => <PayoutRow key={p.id} payout={p} symbol={symbol} />);
  }

  return (
    <Stack spacing={1.5}>
      <HostSectionHeader title={t('mweb.hostManage.hostShare')} count={payouts.length} />
      <RowGroup>{body}</RowGroup>
    </Stack>
  );
}
