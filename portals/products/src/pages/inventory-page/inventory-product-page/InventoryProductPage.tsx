import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, CircularProgress, Container, Snackbar, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitButton } from '@duncit/buttons';
import ProductFormBody from './ProductFormBody';
import ProductPageHeader from './ProductPageHeader';
import {
  INVENTORY_ACTIVITY_LOGS,
  INVENTORY_ANALYTICS,
  INVENTORY_CATEGORIES,
  INVENTORY_PRODUCT_DETAIL,
  INVENTORY_STOCK_MOVEMENTS,
} from './productQueries';
import { CREATE_PRODUCT, UPDATE_PRODUCT } from '../queries';
import { productListLabel, productListPath } from './productPaths';
import { productSchema } from './schema';
import { toFormValues, toSubmitInput, type InventoryProductFormValues } from './types';
import { useTranslation } from '@duncit/shell';

export default function InventoryProductPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // `brandId` is present only on /catalog/brands/:brandId/products/:id/edit,
  // where the editor belongs to one brand's catalogue instead of Duncit's.
  const { id, brandId } = useParams<{ id: string; brandId: string }>();
  const isNew = !id;
  const backTo = productListPath(brandId);
  const backLabel = `Back to ${productListLabel(brandId).toLowerCase()}`;
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const productQuery = useQuery<any>(INVENTORY_PRODUCT_DETAIL, {
    variables: { id },
    skip: isNew,
    fetchPolicy: 'cache-and-network',
  });
  const categoriesQuery = useQuery<any>(INVENTORY_CATEGORIES, { fetchPolicy: 'cache-first' });
  const logsQuery = useQuery<any>(INVENTORY_ACTIVITY_LOGS, {
    variables: { id },
    skip: isNew,
    fetchPolicy: 'cache-and-network',
  });
  const movementsQuery = useQuery<any>(INVENTORY_STOCK_MOVEMENTS, {
    variables: { id },
    skip: isNew,
    fetchPolicy: 'cache-and-network',
  });
  const analyticsQuery = useQuery<any>(INVENTORY_ANALYTICS, {
    variables: { id },
    skip: isNew,
    fetchPolicy: 'cache-and-network',
  });

  const [createProduct] = useMutation<any>(CREATE_PRODUCT);
  const [updateProduct] = useMutation<any>(UPDATE_PRODUCT);

  const initialValues = useMemo(
    () => toFormValues(productQuery.data?.inventoryProduct),
    [productQuery.data]
  );
  const categories = (categoriesQuery.data?.categories ?? []).filter(
    (c: any) => c.level !== 'SUPER'
  );

  const methods = useForm<InventoryProductFormValues, any, InventoryProductFormValues>({
    resolver: zodResolver(productSchema) as unknown as Resolver<InventoryProductFormValues, any, InventoryProductFormValues>,
    mode: 'onChange',
    defaultValues: initialValues,
  });

  // Mirrors Formik `enableReinitialize`: refill when the loaded product changes.
  useEffect(() => {
    methods.reset(initialValues);
  }, [initialValues, methods]);

  const onSubmit = async (values: InventoryProductFormValues) => {
    setError(null);
    try {
      const input = toSubmitInput(values);
      if (id) {
        await updateProduct({ variables: { id, input } });
        setToast(t('products.inventory.saved'));
        await productQuery.refetch();
        methods.reset(values);
      } else {
        const res = await createProduct({ variables: { input } });
        const newId = res.data?.createInventoryProduct?.id;
        setToast(t('products.inventory.created'));
        if (newId) navigate(`/inventory/${newId}/edit`, { replace: true });
      }
    } catch (err: any) {
      /* v8 ignore next -- Apollo rejects with an Error carrying a message; fallback is defensive */
      setError(err?.message ?? 'Save failed');
    }
  };

  if (!isNew && productQuery.loading && !productQuery.data) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          py: 8
        }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (!isNew && !productQuery.loading && !productQuery.data?.inventoryProduct) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">{t('products.inventory.notFound')}</Alert>
        <DuncitButton sx={{ mt: 2 }} startIcon={<ArrowBackIcon />} onClick={() => navigate(backTo)}>
          {backLabel}
        </DuncitButton>
      </Container>
    );
  }

  const product = productQuery.data?.inventoryProduct ?? null;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <ProductPageHeader
        isNew={isNew}
        product={product}
        brandId={brandId}
        onError={setError}
        onToast={setToast}
        onRefetch={productQuery.refetch}
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <FormProvider {...methods}>
        <ProductFormBody
          isNew={isNew}
          categories={categories}
          logs={logsQuery.data?.inventoryActivityLogs ?? []}
          movements={movementsQuery.data?.inventoryStockMovements ?? []}
          analytics={analyticsQuery.data?.inventoryAnalytics ?? []}
          activityLoading={
            logsQuery.loading || movementsQuery.loading || analyticsQuery.loading
          }
          onCancel={() => navigate(backTo)}
          onAfterSave={() => navigate(backTo)}
          onSubmit={onSubmit}
          onError={setError}
        />
      </FormProvider>
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Container>
  );
}
