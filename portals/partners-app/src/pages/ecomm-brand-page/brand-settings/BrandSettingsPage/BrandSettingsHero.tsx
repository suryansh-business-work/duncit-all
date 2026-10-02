import { Box, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { EcommBrand } from '../../queries';
import { primaryHeroBackground } from '../../../../components/primaryHero';

interface Props {
  brand: EcommBrand | null;
  onBack: () => void;
}

/** Branded header with the way back to the brand list. */
export default function BrandSettingsHero({ brand, onBack }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        p: 2.5, borderRadius: 2, color: 'common.white',
        background: primaryHeroBackground,
      }}
    >
      <DuncitButton
        onClick={onBack}
        startIcon={<ArrowBackIcon />}
        variant="outlined"
        sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.55)' }}
      >
        {t('partners.venueAvailabilityPage.back')}
      </DuncitButton>
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontWeight: 950,
          mt: 1
        }}>
        {brand?.brand_name || 'Brand'} settings
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
        Warehouses your products ship from. Orders pick up from the warehouse chosen on each product.
      </Typography>
    </Box>
  );
}
