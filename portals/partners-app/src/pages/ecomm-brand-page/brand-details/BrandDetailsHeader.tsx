import { useNavigate } from 'react-router';
import { Avatar, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SettingsIcon from '@mui/icons-material/Settings';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { EcommBrand } from '../queries';
import { StatusCell } from '../brand-table-cells';

/** Logo, name, status + live, and the doors into setup, products and settings. */
export default function BrandDetailsHeader({ brand }: Readonly<{ brand: EcommBrand }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const base = `/ecomm-brand/${brand.id}`;
  const approved = brand.status === 'APPROVED';
  const locked = brand.status === 'SUBMITTED' || approved;
  const name = brand.brand_name || t('partners.ecommBrandPage.untitledBrand');
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
          <Avatar src={brand.logo_url || undefined} alt="" variant="rounded" sx={{ width: 64, height: 64 }}>
            {name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
              {name}
            </Typography>
            {brand.tagline && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {brand.tagline}
              </Typography>
            )}
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              {brand.brand_no && <Chip size="small" variant="outlined" label={brand.brand_no} />}
              <StatusCell brand={brand} />
            </Stack>
          </Box>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <DuncitButton
              variant="outlined"
              startIcon={locked ? <VisibilityIcon /> : <EditIcon />}
              onClick={() => navigate(`${base}/edit`)}
              data-testid="brand-details-setup"
            >
              {locked ? t('partners.brandDetails.viewSetup') : t('partners.brandDetails.editSetup')}
            </DuncitButton>
            {approved && (
              <DuncitButton
                variant="outlined"
                startIcon={<Inventory2Icon />}
                onClick={() => navigate(`${base}/products`)}
                data-testid="brand-details-products"
              >
                {t('partners.ecommBrandPage.products')}
              </DuncitButton>
            )}
            <DuncitButton
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => navigate(`${base}/settings`)}
              data-testid="brand-details-settings"
            >
              {t('partners.ecommBrandPage.brandSettings')}
            </DuncitButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
