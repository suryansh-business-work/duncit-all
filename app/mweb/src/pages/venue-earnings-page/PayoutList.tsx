import { useState } from 'react';
import { Box, Chip, Collapse, IconButton, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useDateFormat } from '../../utils/dateFormat';

interface PayoutBreakdown {
  version: number;
  share_amount: number;
  commission_pct: number;
  commission_amount: number;
  payout_amount: number;
}

export interface VenuePayout {
  id: string;
  pod_title: string;
  status: string;
  amount_requested: number;
  approved_amount?: number | null;
  created_at: string;
  breakdown?: PayoutBreakdown | null;
}

const STATUS_COLOR: Record<string, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

function PayoutRow({ payout, symbol }: Readonly<{ payout: VenuePayout; symbol: string }>) {
  const [open, setOpen] = useState(false);
  const { formatDate } = useDateFormat();
  const fmt = (n: number) => `${symbol}${(Number(n) || 0).toFixed(2)}`;
  const b = payout.breakdown;
  const payable = payout.approved_amount ?? b?.payout_amount ?? payout.amount_requested;
  const expandable = (b?.version ?? 0) >= 2;

  return (
    <Box sx={{ p: 1.25, borderRadius: 3, border: 1, borderColor: 'divider' }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 800 }} noWrap>
          {payout.pod_title}
        </Typography>
        <Chip size="small" color={STATUS_COLOR[payout.status] ?? 'default'} label={payout.status} />
      </Stack>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.25 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }} noWrap>
          {formatDate(payout.created_at)}
        </Typography>
        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 900 }}>
          {fmt(payable)}
        </Typography>
        {expandable && (
          <IconButton
            size="small"
            aria-label="Show payout breakdown"
            onClick={() => setOpen((v) => !v)}
            sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
          >
            <ExpandMoreIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
      {expandable && b && (
        <Collapse in={open} unmountOnExit>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Slot price {fmt(b.share_amount)} − commission ({b.commission_pct}%) {fmt(b.commission_amount)} = {fmt(payable)}
          </Typography>
        </Collapse>
      )}
    </Box>
  );
}

/** Venue payout history — one row per completion release, expandable v2 math. */
export default function PayoutList({ payouts, symbol }: Readonly<{ payouts: VenuePayout[]; symbol: string }>) {
  return (
    <Stack spacing={1}>
      {payouts.map((payout) => (
        <PayoutRow key={payout.id} payout={payout} symbol={symbol} />
      ))}
    </Stack>
  );
}
