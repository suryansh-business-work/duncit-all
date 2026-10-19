import { Box, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

import { SectionHeading } from '../../../components/SectionHeading';
import { SmartLink } from '../../../components/SmartLink';
import { StoreImage } from '../../../components/StoreImage';
import type { StoreSectionItem } from '../../../graphql/catalog';
import { paths } from '../../../lib/paths';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T } from '../../../theme/tokens';
import type { SectionProps } from './types';

/** The dark wash under a banner's words: the nav-bar ink at 70%, which keeps white text well above 4.5:1. */
const SCRIM = `linear-gradient(to top, color-mix(in srgb, ${T.navBar} 70%, transparent) 70%, transparent)`;

const columns = (count: number) => `repeat(${Math.min(count, 3)}, minmax(0, 1fr))`;

/** The words over a banner's bottom edge, when the operator wrote any. */
function BannerWords({ item }: Readonly<{ item: StoreSectionItem }>) {
  if (!item.eyebrow && !item.title && !item.cta_label) return null;
  return (
    <Stack spacing={0.5} sx={{ position: 'absolute', insetInline: 0, bottom: 0, pt: 6, px: { xs: 2, md: 3 }, pb: { xs: 2, md: 2.5 }, background: SCRIM, color: T.onBrand }}>
      {item.eyebrow ? (
        <Typography variant="overline" component="p" sx={{ color: 'inherit', lineHeight: 1.4 }}>
          {item.eyebrow}
        </Typography>
      ) : null}
      {item.title ? (
        <Typography variant="h3" component="p" sx={{ color: 'inherit', fontWeight: 800 }}>
          {item.title}
        </Typography>
      ) : null}
      {item.cta_label ? (
        <Typography sx={{ color: 'inherit', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          {item.cta_label}
          <ArrowForwardRoundedIcon fontSize="small" aria-hidden />
        </Typography>
      ) : null}
    </Stack>
  );
}

/** PROMO_BANNERS — "Offers & banners": rounded pictures that link somewhere, words on a scrim. */
export function PromoBannersSection({ section }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  if (section.items.length === 0) return null;
  return (
    <Box component="section" aria-label={section.title || undefined}>
      {section.title ? <SectionHeading title={section.title} subtitle={section.subtitle} /> : null}
      <Box
        component="ul"
        sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: columns(Math.min(section.items.length, 2)), md: columns(section.items.length) } }}
      >
        {section.items.map((item) => (
          <Box component="li" key={item.id}>
            <SmartLink to={item.link || paths.shop} underline="none" aria-label={item.title || item.cta_label || item.eyebrow || t('ecommStore.home.viewOffer')} sx={{ display: 'block' }}>
              <Box sx={{ position: 'relative', borderRadius: `${T.radius.card}px`, overflow: 'hidden', boxShadow: T.shadow }}>
                <StoreImage src={item.image_url} alt={item.title} width={640} height={320} />
                <BannerWords item={item} />
              </Box>
            </SmartLink>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
