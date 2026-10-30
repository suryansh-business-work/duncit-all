import { Box, Stack, Typography } from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';

import { useStoreSettings } from '../../../app/providers/StoreSettingsProvider';
import { useMoney } from '../../../lib/money';
import { paths } from '../../../lib/paths';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T } from '../../../theme/tokens';
import { CtaPill } from './CtaPill';
import type { SectionProps } from './types';

const AMOUNT_TOKEN = '{amount}';

/**
 * FREE_DELIVERY: the "Free delivery above ₹X" strip with its pill, where the
 * operator placed it. A title replaces the built-in line ({amount} becomes the
 * threshold); the first item's label and link replace "Shop now". Hidden when
 * delivery is never free.
 */
export function FreeDeliverySection({ section }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  const money = useMoney();
  const { free_shipping_above: above } = useStoreSettings();
  if (above <= 0) return null;
  const amount = money(above);
  const line = section.title.trim() ? section.title.replaceAll(AMOUNT_TOKEN, amount) : t('ecommStore.home.freeDelivery', { vars: { amount } });
  const item = section.items[0];
  const custom = item?.cta_label && item.link ? item : null;
  return (
    <Stack
      component="section"
      aria-label={line}
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ alignItems: { sm: 'center' }, bgcolor: T.surface, borderRadius: `${T.radius.card}px`, px: { xs: 2, md: 3 }, py: 2, boxShadow: T.shadow }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: T.brandTint, display: 'grid', placeItems: 'center', flexShrink: 0 }} aria-hidden>
          <LocalShippingOutlinedIcon sx={{ color: T.ctaInk }} />
        </Box>
        <Typography sx={{ fontWeight: 800 }}>{line}</Typography>
      </Stack>
      <CtaPill
        label={custom?.cta_label ?? t('ecommStore.home.shopNow')}
        link={custom?.link ?? paths.shop}
        size="medium"
        sx={{ flexShrink: 0, whiteSpace: 'nowrap', alignSelf: { xs: 'flex-start', sm: 'center' } }}
      />
    </Stack>
  );
}
