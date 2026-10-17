import { Box, Typography } from '@mui/material';
import { rentalLinePrice, rentalMoney, type PodRentalItem } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  item: PodRentalItem;
  quantity: number;
  /** The pod's chargeable hours, as the server counts them (catalogue.hours). */
  hours: number;
  currency: string;
}

/** How one picked item's price is made: rate × hours × qty, and the refundable deposit on its own line. */
export default function RentalLineBreakdown({ item, quantity, hours, currency }: Readonly<Props>) {
  const { t } = useTranslation();
  const line = rentalLinePrice(item, quantity, hours);
  if (line.quantity <= 0) return null;
  const money = (amount: number) => rentalMoney(currency, amount);
  const rentVars = { rate: money(item.rate), quantity: line.quantity, amount: money(line.rent) };
  const rent =
    item.unit === 'HOUR'
      ? t('venueRentals.guest.rentMathHour', { count: line.units, vars: rentVars })
      : t('venueRentals.guest.rentMathSlot', { vars: rentVars });
  return (
    <Box sx={{ mt: 0.5 }} data-testid={`pod-rent-math-${item.id}`}>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
        {rent}
      </Typography>
      {line.deposit > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {t('venueRentals.guest.depositMath', {
            vars: { rate: money(item.deposit), quantity: line.quantity, amount: money(line.deposit) },
          })}
        </Typography>
      )}
    </Box>
  );
}
