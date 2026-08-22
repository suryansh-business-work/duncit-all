import { Box, Divider, Stack, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import type { SlotDecisionRow } from './queries';
import { useTranslation } from '@duncit/shell';

const money = (value: number) => formatMoney(value, { symbol: '₹', decimals: 2 });

interface Props {
  request: SlotDecisionRow;
  /** Declined view: the same figures, framed as what the venue walked away from. */
  lost?: boolean;
}

/**
 * The venue's money on one slot: gross slot price, Duncit's commission (the
 * venue's ONLY deduction — GST, platform fee and the club-admin cut all come
 * off the host's side), and the take-home as the hero number.
 */
export default function EarningsBreakdown({ request, lost = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const accent = lost ? 'text.disabled' : 'success.main';
  return (
    <Box
      sx={{
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: { xs: 2, sm: 2.5 },
      }}
    >
      <Typography variant="overline" color="text.secondary">
        {lost ? 'Earning you passed on' : 'Your earning from this booking'}
      </Typography>

      <Typography
        sx={{
          mt: 0.5,
          fontWeight: 700,
          lineHeight: 1.1,
          fontSize: { xs: '2.4rem', sm: '3rem' },
          color: accent,
          textDecoration: lost ? 'line-through' : 'none',
        }}
      >
        {money(request.venue_receives)}
      </Typography>

      <Stack spacing={1} sx={{ mt: 2 }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t('partners.slotRequestsPage.slotPrice')}
          </Typography>
          <Typography variant="body2" fontWeight={700}>
            {money(request.price)}
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Duncit commission ({request.venue_commission_pct}%)
          </Typography>
          <Typography variant="body2" fontWeight={700} color="error.main">
            − {money(request.venue_commission_amount)}
          </Typography>
        </Stack>
        <Divider />
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Typography variant="body2" fontWeight={700}>
            {lost ? 'You would have received' : 'You receive'}
          </Typography>
          <Typography variant="body2" fontWeight={700} color={accent}>
            {money(request.venue_receives)}
          </Typography>
        </Stack>
      </Stack>

      {!lost && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Credited to your Duncit wallet once the pod completes. The slot price is a
          ceiling — if the pod does not sell out, settlement pays what the pod actually
          collected.
        </Typography>
      )}
    </Box>
  );
}
