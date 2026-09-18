import { Link as RouterLink } from 'react-router';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';

import { ProductSlider } from '../../../components/ProductSlider';
import { SectionHeading } from '../../../components/SectionHeading';
import { StoreImage } from '../../../components/StoreImage';
import { paths } from '../../../lib/paths';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T } from '../../../theme/tokens';
import type { SectionProps } from './types';

/** Where "View all" goes: the collection, else the first category, else the whole shop. */
function sliderTarget(section: SectionProps['section']): string {
  if (section.collection) return paths.collection(section.collection.slug);
  const category = section.categories[0];
  return category ? paths.category(category.slug) : paths.shop;
}

/** PRODUCT_SLIDER: a scrolling rail of pastel cards with quick add. */
export function ProductSliderSection({ section }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  if (section.products.length === 0) return null;
  const title = section.title || t('ecommStore.home.featured');
  return (
    <Box component="section" aria-label={title}>
      <SectionHeading title={title} subtitle={section.subtitle} viewAll={sliderTarget(section)} />
      <ProductSlider products={section.products} label={title} />
    </Box>
  );
}

/** CATEGORY_ICONS: round aisle icons with their names — a scrolling row on a phone. */
export function CategoryIconsSection({ section }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  if (section.categories.length === 0) return null;
  const title = section.title || t('ecommStore.home.categories');
  return (
    <Box component="section" aria-label={title}>
      <SectionHeading title={title} subtitle={section.subtitle} />
      <Stack
        component="ul"
        direction="row"
        sx={{
          listStyle: 'none',
          p: 0,
          m: 0,
          gap: { xs: 1.5, md: 3 },
          overflowX: { xs: 'auto', md: 'visible' },
          flexWrap: { xs: 'nowrap', md: 'wrap' },
          justifyContent: { md: 'center' },
          pb: 1,
        }}
      >
        {section.categories.map((category) => (
          <Stack component="li" key={category.id} sx={{ flexShrink: 0 }}>
            <ButtonBase
              component={RouterLink}
              to={paths.category(category.slug)}
              sx={{ flexDirection: 'column', gap: 1, borderRadius: `${T.radius.panel}px`, p: 0.5, width: 92 }}
            >
              <Box
                sx={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  bgcolor: T.surface,
                  boxShadow: `0 0 0 4px ${T.brandTint}`,
                  overflow: 'hidden',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <StoreImage src={category.image_url} alt="" width={60} height={60} sx={{ width: 60, objectFit: 'contain' }} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center' }}>
                {category.name}
              </Typography>
            </ButtonBase>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
