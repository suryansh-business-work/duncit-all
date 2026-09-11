import type { ReactNode } from 'react';
import { Box, Card, Chip, Stack, Typography } from '@mui/material';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import CallMadeRoundedIcon from '@mui/icons-material/CallMadeRounded';
import CallReceivedRoundedIcon from '@mui/icons-material/CallReceivedRounded';
import SectionHeader from '../../components/SectionHeader';
import { formatDate } from '../../utils/dateFormat';

const STATUS_COLOR: Record<string, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  PAID: 'success',
  REJECTED: 'error',
};

/** The row's icon: a 40px soft disc. */
const DISC_SX = {
  width: 40,
  height: 40,
  flexShrink: 0,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  bgcolor: 'action.hover',
  color: 'text.secondary',
  '& svg': { fontSize: 20 },
} as const;

const ROW_SX = { alignItems: 'center', py: 1.5, '& + &': { borderTop: 1, borderColor: 'divider' } } as const;

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return formatDate(d) || '—';
};

/** A titled list: the section header, then its rows inside one card — or the
 * one muted line when there is nothing yet. */
export function WalletSection({
  title,
  emptyText,
  children,
}: Readonly<{ title: string; emptyText: string; children: ReactNode[] }>) {
  return (
    <Stack spacing={1.25}>
      <SectionHeader title={title} />
      <Card sx={{ px: 2, py: 0.5 }}>
        {children.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 1.5 }}>
            {emptyText}
          </Typography>
        ) : (
          children
        )}
      </Card>
    </Stack>
  );
}

/** One withdrawal: amount · method, when it was requested (and why it was
 * rejected), and its status pill. */
export function WithdrawalRow({ w, currency }: Readonly<{ w: any; currency: string }>) {
  return (
    <Stack direction="row" spacing={1.5} sx={ROW_SX}>
      <Box sx={DISC_SX}>
        <AccountBalanceOutlinedIcon />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {currency}
          {w.amount.toFixed(2)} · {w.payout_method}
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
          Requested {fmtDate(w.created_at)}
          {w.reject_reason ? ` · ${w.reject_reason}` : ''}
        </Typography>
      </Box>
      <Chip size="small" color={STATUS_COLOR[w.status] ?? 'default'} label={w.status} />
    </Stack>
  );
}

/** One ledger line: a credit arrow in / debit arrow out, what it was for, the
 * date, and the amount — green for money in, ink for money out. */
export function TxnRow({ txn, currency }: Readonly<{ txn: any; currency: string }>) {
  const credit = txn.type === 'CREDIT';
  return (
    <Stack direction="row" spacing={1.5} sx={ROW_SX}>
      <Box sx={DISC_SX}>{credit ? <CallReceivedRoundedIcon /> : <CallMadeRoundedIcon />}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {txn.reason || txn.source}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {fmtDate(txn.created_at)}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, color: credit ? 'success.main' : 'text.primary' }}>
        {credit ? '+' : '−'}
        {currency}
        {txn.amount.toFixed(2)}
      </Typography>
    </Stack>
  );
}
