import { Stack, Typography } from '@mui/material';

import type { StoreHomeSection } from '../../graphql/catalog';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';
import { CountdownBoxes } from '../home/sections/flash-sale/CountdownBoxes';
import { useCountdown } from '../home/sections/flash-sale/useCountdown';

/** The live flash sale's countdown, while it has an end that has not passed. */
function SaleCountdown({ flash }: Readonly<{ flash: StoreHomeSection }>) {
  const { t } = useStoreT();
  const countdown = useCountdown(flash.ends_at);
  if (!countdown.ends || countdown.over) return null;
  return (
    <Stack spacing={1} sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
      <Typography variant="overline" component="p" sx={{ color: T.ctaInk, lineHeight: 1.4 }}>
        {flash.title || t('ecommStore.flash.title')}
      </Typography>
      <CountdownBoxes countdown={countdown} />
    </Stack>
  );
}

/** The page's title block on the hero gradient, with the flash sale's clock when one runs. */
export function DealsHero({ flash }: Readonly<{ flash: StoreHomeSection | undefined }>) {
  const { t } = useStoreT();
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{
        justifyContent: 'space-between',
        alignItems: { md: 'center' },
        background: T.heroGradient,
        borderRadius: `${T.radius.card}px`,
        px: { xs: 2.5, md: 6 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Typography variant="h1">{t('ecommStore.deals.title')}</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
          {t('ecommStore.deals.subtitle')}
        </Typography>
      </Stack>
      {flash ? <SaleCountdown flash={flash} /> : null}
    </Stack>
  );
}
