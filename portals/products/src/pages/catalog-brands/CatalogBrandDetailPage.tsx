import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useParams } from 'react-router-dom';
import { Alert, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { BackHeader } from '@duncit/ui';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import BrandCommercePanel from './BrandCommercePanel';
import BrandSummaryCard from './BrandSummaryCard';
import { BrandForm, toFormValues, toSubmitInput, type BrandFormValues } from './brand-form';
import { ADMIN_UPDATE_ECOMM_BRAND, CATALOG_BRAND, type CatalogBrandDetail } from './queries';
import { useTranslation } from '@duncit/shell';

/**
 * Catalog > Brands > manage one brand. Editing, commission and marketplace
 * visibility live here; approving or rejecting a brand does NOT — that is the
 * Brands Review inbox, which BrandSummaryCard links to.
 */
export default function CatalogBrandDetailPage() {
  const { t } = useTranslation();
  const { brandId = '' } = useParams<{ brandId: string }>();
  const [error, setError] = useState<string | null>(null);

  const brandQuery = useQuery(CATALOG_BRAND, {
    variables: { id: brandId },
    fetchPolicy: 'cache-and-network',
  });
  const [updateBrand, updateState] = useMutation(ADMIN_UPDATE_ECOMM_BRAND);

  const brand: CatalogBrandDetail | null = brandQuery.data?.ecommBrand ?? null;
  const initialValues = useMemo(() => toFormValues(brand), [brand]);

  const save = async (values: BrandFormValues) => {
    setError(null);
    try {
      // No `status` argument on purpose: passing APPROVED here would grant the
      // owner the E-commerce Manager role — a back-door approve inside Catalog.
      await updateBrand({ variables: { id: brandId, input: toSubmitInput(values) } });
      await brandQuery.refetch();
      notifySuccess('Brand details saved');
    } catch (err) {
      setError(parseApiError(err, 'Could not save the brand'));
    }
  };

  if (brandQuery.loading && !brandQuery.data) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (!brand) {
    return (
      <Stack spacing={2}>
        <BackHeader title={t('products.brandForm.section')} eyebrow="Catalog · Brands" backTo="/catalog/brands" />
        <Alert severity="warning">{t('products.brands.notFound')}</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <BackHeader
        title={brand.brand_name}
        eyebrow="Catalog · Brands"
        backTo="/catalog/brands"
        backAriaLabel="Back to brands"
      />

      <BrandSummaryCard brand={brand} productsTo={`/catalog/brands/${brandId}/products`} />

      <BrandCommercePanel brand={brand} onChanged={brandQuery.refetch} />

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={700}>
              Brand details
            </Typography>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <BrandForm
              initialValues={initialValues}
              saving={updateState.loading}
              onSubmit={save}
            />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
