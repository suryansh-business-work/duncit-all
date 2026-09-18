import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { Loader } from '@duncit/ui';

import { StoreImage } from '../../components/StoreImage';
import { STORE_BRANDS } from '../../graphql/catalog';
import { paths } from '../../lib/paths';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T, tintAt } from '../../theme/tokens';

/** /brands — every brand on the shelf. */
export function BrandsPage() {
  const { t } = useStoreT();
  usePageSeo(t('ecommStore.menu.brands'));
  const { data, loading } = useQuery(STORE_BRANDS);
  const brands = data?.storeBrands ?? [];
  return (
    <Stack spacing={2}>
      <Typography variant="h1">{t('ecommStore.menu.brands')}</Typography>
      {loading && brands.length === 0 ? <Loader label={t('ecommStore.common.loading')} /> : null}
      <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' } }}>
        {brands.map((brand, position) => (
          <Box component="li" key={brand.id}>
            <ButtonBase
              component={RouterLink}
              to={paths.brand(brand.id)}
              sx={{ width: '100%', flexDirection: 'column', gap: 1, p: 2, borderRadius: `${T.radius.card}px`, bgcolor: tintAt(position) }}
            >
              <Box sx={{ width: 96, height: 96, borderRadius: '50%', bgcolor: T.surface, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
                <StoreImage src={brand.logo_url} alt="" width={80} height={80} sx={{ width: 80, objectFit: 'contain' }} />
              </Box>
              <Typography sx={{ fontWeight: 800 }}>{brand.name}</Typography>
              {brand.tagline ? (
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {brand.tagline}
                </Typography>
              ) : null}
            </ButtonBase>
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
