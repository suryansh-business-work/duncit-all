import { Box, Chip, Stack, Typography } from '@mui/material';
import HandshakeIcon from '@mui/icons-material/HandshakeOutlined';
import { rentalMoney, rentalRefundKey, rentalStatusKey, rentalUnitKey, type RentalBookingRow } from '@duncit/utils';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { formatDateTime } from '../../utils/dateFormat';

/** The money line a guest cares about once a rental closed: what comes back, or what was kept. */
function outcomeLine(t: ReturnType<typeof useTranslation>['t'], row: RentalBookingRow): string | null {
  const money = (amount: number) => rentalMoney(row.currency_symbol, amount);
  if (row.refund_status === 'PAID' || row.refund_status === 'IN_PAYMENT') {
    return t('venueRentals.guest.refunded', { vars: { amount: money(row.refund_due) } });
  }
  if (row.refund_status === 'DUE') return t('venueRentals.guest.refundDue', { vars: { amount: money(row.refund_due) } });
  if (row.damage_claim > 0) return t('venueRentals.guest.damageKept', { vars: { amount: money(row.damage_claim) } });
  return null;
}

/** One rented item on one of the member's pods: what, for which pod, what it cost and how it closed. */
export default function RentalBookingCard({ row }: Readonly<{ row: RentalBookingRow }>) {
  const { t } = useTranslation();
  const money = (amount: number) => rentalMoney(row.currency_symbol, amount);
  const outcome = outcomeLine(t, row);
  return (
    <Stack direction="row" spacing={1.5} sx={{ ...SURFACE_SX, p: 1.5 }} data-testid={`rented-item-${row.id}`}>
      <Box sx={{ width: 56, height: 56, borderRadius: '12px', overflow: 'hidden', flex: '0 0 auto', bgcolor: 'action.hover', display: 'grid', placeItems: 'center', color: 'secondary.main' }}>
        {row.image_url ? (
          <Box component="img" src={row.image_url} alt={row.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <HandshakeIcon fontSize="small" />
        )}
      </Box>
      <Stack sx={{ minWidth: 0, flex: 1 }} spacing={0.25}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
            {row.name}
          </Typography>
          <Chip size="small" label={t(rentalStatusKey(row.status))} />
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
          {t('venueRentals.guest.forPod', { vars: { pod: row.pod_title } })} · {formatDateTime(row.created_at)}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('venueRentals.guest.units', { vars: { quantity: row.quantity, units: row.units, unit: t(rentalUnitKey(row.unit)) } })}
          {' · '}
          {money(row.rent_amount)}
          {row.deposit_amount > 0 && ` · ${t('venueRentals.guest.deposit', { vars: { amount: money(row.deposit_amount) } })}`}
        </Typography>
        {outcome && (
          <Typography variant="caption" sx={{ fontWeight: 600 }} data-testid={`rented-item-${row.id}-outcome`}>
            {outcome} · {t(rentalRefundKey(row.refund_status))}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
