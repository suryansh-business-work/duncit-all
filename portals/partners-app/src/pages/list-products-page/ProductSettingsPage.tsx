import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Card, CardContent, CircularProgress, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import { MY_PRODUCT_LISTINGS } from './ProductListingsTable';
import { UPDATE_PRODUCT_SETTINGS } from './queries';
import { PRODUCT_ACCESS_MESSAGE, PRODUCT_LISTING_ACCESS, canManageProductListings } from './productAccess';
import { useTranslation } from '@duncit/shell';

const settingsSchema = z.object({
  low_stock_alert: z.coerce
    .number({ invalid_type_error: 'Enter a whole number' })
    .int('Enter a whole number')
    .min(0, 'Cannot be negative')
    .max(1000000),
  notify_low_stock: z.boolean(),
});
type SettingsValues = z.infer<typeof settingsSchema>;

export default function ProductSettingsPage() {
  const { t } = useTranslation();
  const { brandId = '', productId = '' } = useParams<{ brandId: string; productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const productsHome = `/ecomm-brand/${brandId}/products`;
  const stateProduct = (location.state as { product?: any } | null)?.product;
  const [apiError, setApiError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: accessData, loading: accessLoading } = useQuery(PRODUCT_LISTING_ACCESS, { fetchPolicy: 'cache-and-network' });
  const { data, loading } = useQuery(MY_PRODUCT_LISTINGS, {
    variables: { brand_id: brandId },
    skip: Boolean(stateProduct),
    fetchPolicy: 'cache-and-network',
  });
  const canManageProducts = canManageProductListings(accessData?.me?.roles);
  const product = stateProduct || data?.myProductListings?.find((item: any) => item.id === productId) || null;

  const [updateSettings, { loading: saving }] = useMutation(UPDATE_PRODUCT_SETTINGS);
  const { control, handleSubmit, reset } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { low_stock_alert: 5, notify_low_stock: false },
  });

  useEffect(() => {
    if (product) {
      reset({ low_stock_alert: Number(product.low_stock_alert ?? 5), notify_low_stock: Boolean(product.notify_low_stock) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);
    setSaved(false);
    try {
      await updateSettings({ variables: { product_doc_id: productId, ...values } });
      setSaved(true);
    } catch (error) {
      setApiError(parseApiError(error));
    }
  });

  if ((accessLoading && !accessData) || (loading && !product)) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          py: 5
        }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  const available = Number(product?.available_count ?? product?.inventory_count ?? 0);

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      <Box
        sx={{
          p: 2.5,
          borderRadius: 2,
          color: 'primary.contrastText',
          background: (t) => `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)`,
        }}
      >
        <DuncitButton onClick={() => navigate(productsHome)} startIcon={<ArrowBackIcon />} variant="outlined" sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.55)' }}>
          {t('partners.venueAvailabilityPage.back')}
        </DuncitButton>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 950,
            mt: 1
          }}>
          {product?.product_name || 'Product'} settings
        </Typography>
      </Box>
      {!canManageProducts && <Alert severity="warning">{PRODUCT_ACCESS_MESSAGE}</Alert>}
      {canManageProducts && !product && <Alert severity="warning">{t('partners.listProductsPage.productListingWasNotFound')}</Alert>}
      {canManageProducts && product && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack spacing={2.25} component="form" onSubmit={onSubmit}>
              {saved && <Alert severity="success">{t('partners.listProductsPage.settingsSaved')}</Alert>}
              {apiError && <Alert severity="error">{apiError}</Alert>}
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                Currently {available} unit{available === 1 ? '' : 's'} available.
              </Typography>
              <RhfTextField
                control={control}
                name="low_stock_alert"
                label={t('partners.listProductsPage.lowStockThreshold')}
                type="number"
                slotProps={{ htmlInput: { min: 0, step: 1, inputMode: 'numeric' } }}
                hint="The product row is highlighted, and you can be notified, when available stock drops to this number or below."
                sx={{ maxWidth: 260 }}
              />
              <Controller
                control={control}
                name="notify_low_stock"
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                    label={t('partners.listProductsPage.notifyMeWhenThisProductHits')}
                  />
                )}
              />
              <DuncitButton type="submit" variant="contained" disabled={saving} sx={{ alignSelf: 'flex-start' }}>
                {saving ? 'Saving...' : 'Save settings'}
              </DuncitButton>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
