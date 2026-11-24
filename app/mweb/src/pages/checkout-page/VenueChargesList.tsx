import { Box, Stack, Typography } from '@mui/material';
import { placeChargesTotal, type PodPlaceCharge } from '@duncit/utils';
import { formatMoney } from './checkoutMath';

interface Props {
  charges: readonly PodPlaceCharge[];
  currency: string;
  /** The total row's label — checkout says "venue", Pod Details says "place". */
  totalLabel: string;
}

/** The venue-side charges, one row each, and their total. Shared by the
 * checkout's info dialog and the confirmation asked before Join / Book.
 * Native twin: components/checkout/VenueChargesList. */
export default function VenueChargesList({ charges, currency, totalLabel }: Readonly<Props>) {
  return (
    <Stack
      spacing={1}
      sx={{ p: 1.5, borderRadius: '16px', bgcolor: 'action.hover' }}
      divider={<Box sx={{ borderBottom: '1px dashed', borderColor: 'divider' }} />}
    >
      {charges.map((charge) => (
        <Stack
          key={`${charge.label}|${charge.amount}|${charge.note ?? ''}`}
          data-testid="venue-charge-row"
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {charge.label}
            </Typography>
            {charge.note && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {charge.note}
              </Typography>
            )}
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {formatMoney(currency, charge.amount)}
          </Typography>
        </Stack>
      ))}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {totalLabel}
        </Typography>
        <Typography variant="body2" data-testid="venue-charges-total" sx={{ fontWeight: 700 }}>
          {formatMoney(currency, placeChargesTotal(charges))}
        </Typography>
      </Stack>
    </Stack>
  );
}
