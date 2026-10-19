import { Box, Stack, Typography } from '@mui/material';

import { StoreImage } from '../../../components/StoreImage';
import { EARNWITH_URL } from '../../../config/env';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T } from '../../../theme/tokens';
import { CtaPill } from './CtaPill';
import type { SectionProps } from './types';

/**
 * EARN_PROMO — "Earn with Duncit": a dark banner (white on the nav-bar fill,
 * which every look keeps above 10:1). Blank operator fields fall back to the
 * bundled copy; the link falls back to Earn with Duncit, opened in a new tab.
 */
export function EarnPromoSection({ section }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  const item = section.items[0];
  const eyebrow = item?.eyebrow || t('ecommStore.earn.eyebrow');
  const title = item?.title || section.title || t('ecommStore.earn.title');
  const subtitle = item?.subtitle || section.subtitle || t('ecommStore.earn.subtitle');
  const cta = item?.cta_label || t('ecommStore.earn.cta');
  const image = item?.image_url ?? '';
  return (
    <Box
      component="section"
      aria-label={title}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: image ? 'minmax(0, 3fr) minmax(0, 2fr)' : 'minmax(0, 1fr)' },
        alignItems: 'center',
        gap: 3,
        bgcolor: T.navBar,
        color: T.onBrand,
        borderRadius: `${T.radius.card}px`,
        overflow: 'hidden',
        boxShadow: T.shadow,
        px: { xs: 3, md: 7 },
        py: { xs: 4, md: 6 },
      }}
    >
      <Stack spacing={1.5} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
        <Typography variant="overline" component="p" sx={{ color: 'inherit', lineHeight: 1.4 }}>
          {eyebrow}
        </Typography>
        <Typography variant="h2" component="h2" sx={{ color: 'inherit', fontWeight: 800, fontSize: { md: '2.25rem' } }}>
          {title}
        </Typography>
        <Typography sx={{ color: 'inherit', maxWidth: 560 }}>{subtitle}</Typography>
        <Box sx={{ pt: 1 }}>
          <CtaPill label={cta} link={item?.link || EARNWITH_URL} inverse />
        </Box>
      </Stack>
      {image ? (
        <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
          <StoreImage src={image} alt="" width={480} height={360} sx={{ objectFit: 'contain' }} />
        </Box>
      ) : null}
    </Box>
  );
}
