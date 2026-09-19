import { Link as RouterLink } from 'react-router';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';

import { PetTypeChips } from '../../../components/PetTypeChips';
import { SectionHeading } from '../../../components/SectionHeading';
import { StoreImage } from '../../../components/StoreImage';
import { paths } from '../../../lib/paths';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T, tintAt } from '../../../theme/tokens';
import type { SectionProps } from './types';

/** "Categories": the pet types as a row of pill chips. */
export function PetTypesSection({ section }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  if (section.pet_types.length === 0) return null;
  const title = section.title || t('ecommStore.home.petTypes');
  return (
    <Box component="section" aria-label={title}>
      <SectionHeading title={title} subtitle={section.subtitle} viewAll={paths.shop} />
      <PetTypeChips pets={section.pet_types} label={title} />
    </Box>
  );
}

/** Aisles as pastel tiles with their photo. */
export function CategoryGridSection({ section }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  if (section.categories.length === 0) return null;
  const title = section.title || t('ecommStore.home.categories');
  return (
    <Box component="section" aria-label={title}>
      <SectionHeading title={title} subtitle={section.subtitle} />
      <Box
        component="ul"
        sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' } }}
      >
        {section.categories.map((category, position) => (
          <Box component="li" key={category.id}>
            <ButtonBase
              component={RouterLink}
              to={paths.category(category.slug)}
              sx={{ width: '100%', borderRadius: `${T.radius.card}px`, bgcolor: tintAt(position), p: 1, display: 'block', textAlign: 'center' }}
            >
              <Box sx={{ bgcolor: T.surface, borderRadius: `${T.radius.panel}px`, overflow: 'hidden', mb: 1 }}>
                <StoreImage src={category.image_url} alt="" width={160} height={160} sx={{ objectFit: 'contain' }} />
              </Box>
              <Typography sx={{ fontWeight: 700 }}>{category.name}</Typography>
            </ButtonBase>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** Brand logos on round white panels, each opening that brand's shelf. */
export function BrandsSection({ section }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  if (section.brands.length === 0) return null;
  const title = section.title || t('ecommStore.home.brands');
  return (
    <Box component="section" aria-label={title}>
      <SectionHeading title={title} subtitle={section.subtitle} viewAll={paths.brands} />
      <Stack component="ul" direction="row" spacing={1.5} sx={{ listStyle: 'none', p: 0, m: 0, overflowX: 'auto', pb: 1 }}>
        {section.brands.map((brand) => (
          <Stack component="li" key={brand.id} sx={{ flexShrink: 0 }}>
            <ButtonBase component={RouterLink} to={paths.brand(brand.slug)} sx={{ borderRadius: `${T.radius.card}px`, flexDirection: 'column', gap: 1, p: 1, width: 112 }}>
              <Box sx={{ width: 88, height: 88, borderRadius: '50%', bgcolor: T.surface, border: 1, borderColor: T.border, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
                <StoreImage src={brand.logo_url} alt="" width={72} height={72} sx={{ objectFit: 'contain', width: 72 }} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                {brand.name}
              </Typography>
            </ButtonBase>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
