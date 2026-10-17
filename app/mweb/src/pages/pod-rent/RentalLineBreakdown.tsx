import { Box, Typography } from '@mui/material';
import { rentalLineCopy, type PodRentalCatalogue, type PodRentalItem } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  item: PodRentalItem;
  quantity: number;
  catalogue: Pick<PodRentalCatalogue, 'hours' | 'currency_symbol'>;
}

/** How one picked item's price is made: rate × hours × qty, and the refundable deposit on its own line. */
export default function RentalLineBreakdown({ item, quantity, catalogue }: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = rentalLineCopy(t, item, quantity, catalogue);
  if (!copy) return null;
  return (
    <Box sx={{ mt: 0.5 }} data-testid={`pod-rent-math-${item.id}`}>
      {[copy.rent, copy.deposit].filter(Boolean).map((text) => (
        <Typography key={text} variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {text}
        </Typography>
      ))}
    </Box>
  );
}
