import { Stack, Typography } from '@mui/material';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';

import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

/** The product's offer line on a brand-tinted pill — dark ink on the pastel, never red text. */
export function OfferPill({ text }: Readonly<{ text: string }>) {
  const { t } = useStoreT();
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignSelf: 'center', alignItems: 'center', bgcolor: T.brandTint, color: T.ink, borderRadius: T.radius.pill, px: 2, py: 0.75, minHeight: 40 }}
      data-testid="product-offer"
    >
      <LocalOfferRoundedIcon fontSize="small" aria-hidden />
      <Typography sx={{ fontWeight: 700 }}>{t('ecommStore.product.offer', { vars: { text } })}</Typography>
    </Stack>
  );
}
