import { Stack, Typography } from '@mui/material';
import type { DayPrice } from './day-price';

/** The price line under a calendar day's badges. */
export default function DayPriceFooter({ price }: Readonly<{ price: DayPrice | null }>) {
  if (!price) return null;
  return (
    <Stack sx={{ mt: 'auto', minWidth: 0 }}>
      <Typography
        variant="caption"
        noWrap
        sx={{ fontWeight: 700, fontSize: { xs: 9, sm: 11 }, lineHeight: 1.2, opacity: price.closed ? 0.8 : 1 }}
      >
        {price.text}
      </Typography>
      {price.adjustment && (
        <Typography
          variant="caption"
          noWrap
          sx={{ fontWeight: 800, fontSize: { xs: 9, sm: 11 }, lineHeight: 1.2, color: price.override ? 'secondary.main' : 'info.main' }}
        >
          {price.adjustment}
        </Typography>
      )}
    </Stack>
  );
}
