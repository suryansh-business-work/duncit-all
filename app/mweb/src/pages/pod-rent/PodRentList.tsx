import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { Loader } from '@duncit/ui';
import { rentalClosedKey, rentalMaxQuantity, rentalMoney, rentalSelectionTotals } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import RentalItemRow from './RentalItemRow';
import type { PodRentalPicks } from './usePodRentalPicks';
import type { PodRentals } from './usePodRentals';

interface Props {
  rentals: PodRentals;
  picks: PodRentalPicks;
  seats: number;
  /** Show only the first few: the Pod Details card. The sheet shows them all. */
  limit?: number;
}

/** What a guest can rent for this pod, with their picks and the running rental total. */
export default function PodRentList({ rentals, picks, seats, limit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { catalogue, loading, error, refetch } = rentals;
  if (loading) return <Loader size={20} />;
  if (error && !catalogue) {
    return (
      <Alert
        severity="error"
        data-testid="pod-rent-error"
        action={
          <DuncitButton size="small" color="inherit" onClick={refetch}>
            {t('venueRentals.guest.retry')}
          </DuncitButton>
        }
      >
        {t('venueRentals.guest.loadError')}
      </Alert>
    );
  }
  if (!catalogue || catalogue.items.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="pod-rent-empty">
        {t('venueRentals.guest.none')}
      </Typography>
    );
  }
  const closedKey = rentalClosedKey(catalogue);
  const shown = limit ? catalogue.items.slice(0, limit) : catalogue.items;
  const totals = rentalSelectionTotals(catalogue.items, picks.picks, catalogue.hours);
  return (
    <Stack spacing={0.9} data-testid="pod-rent-list">
      {closedKey && (
        <Alert severity="info" data-testid="pod-rent-closed">
          {t(closedKey, { vars: { hours: rentals.settings?.booking_cutoff_hours ?? 0 } })}
        </Alert>
      )}
      {shown.map((item) => (
        <RentalItemRow
          key={item.id}
          item={item}
          catalogue={catalogue}
          quantity={picks.picks[item.id] ?? 0}
          max={rentalMaxQuantity(item, seats)}
          readOnly={!catalogue.open}
          onQuantity={picks.setQuantity}
        />
      ))}
      {totals.count > 0 && (
        <Stack spacing={0.25} sx={{ pt: 0.5 }} data-testid="pod-rent-total">
          <SummaryRow label={t('venueRentals.guest.rentSubtotal')} amount={rentalMoney(catalogue.currency_symbol, totals.rent)} testId="pod-rent-subtotal" />
          {totals.deposit > 0 && (
            <SummaryRow label={t('venueRentals.guest.depositLine')} amount={rentalMoney(catalogue.currency_symbol, totals.deposit)} testId="pod-rent-deposit" />
          )}
          <SummaryRow label={t('venueRentals.guest.total')} amount={rentalMoney(catalogue.currency_symbol, totals.total)} testId="pod-rent-grand-total" strong />
        </Stack>
      )}
    </Stack>
  );
}

function SummaryRow({ label, amount, testId, strong = false }: Readonly<{ label: string; amount: string; testId: string; strong?: boolean }>) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }} data-testid={testId}>
      <Typography variant={strong ? 'subtitle2' : 'caption'} sx={{ color: strong ? 'text.primary' : 'text.secondary', fontWeight: strong ? 700 : undefined }}>
        {label}
      </Typography>
      <Typography variant={strong ? 'subtitle2' : 'caption'} sx={{ fontWeight: strong ? 700 : 600 }}>
        {amount}
      </Typography>
    </Stack>
  );
}
