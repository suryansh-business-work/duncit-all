import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import BrandPicker from '../BrandPicker';
import BrandToolHero from '../BrandToolHero';
import BrandSettingsPage from '../brand-settings/BrandSettingsPage';
import { MY_BRAND_OPTIONS, type BrandOption } from '../queries';

/**
 * Every brand's warehouses in one place: pick the brand (when there is more
 * than one), then the same warehouse list, editor and ShipRocket sync the
 * brand's own Warehouses tab shows.
 */
export default function WarehousesPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ myEcommBrands: BrandOption[] }>(MY_BRAND_OPTIONS, { fetchPolicy: 'cache-and-network' });
  const brands = data?.myEcommBrands ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  // Until the partner picks, the first brand is shown.
  const brandId = picked ?? brands[0]?.id ?? '';

  const body = () => {
    if (loading && !data) return <CircularProgress size={24} aria-label={t('shell.a11y.loading')} sx={{ alignSelf: 'center' }} />;
    if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;
    if (!brandId) return <Alert severity="info">{t('partners.ecommBrandPage.noBrandsYetCreateYourFirst')}</Alert>;
    return (
      <>
        <BrandPicker brands={brands} value={brandId} onChange={setPicked} />
        <BrandSettingsPage key={brandId} embedded brandId={brandId} />
      </>
    );
  };

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      <BrandToolHero title={t('partners.warehouses.title')} intro={t('partners.warehouses.intro')} />
      {body()}
    </Stack>
  );
}
