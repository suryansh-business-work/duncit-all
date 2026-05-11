import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  CircularProgress,
  Container,
  Snackbar,
  Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Formik } from 'formik';
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
import { productSchema } from './schema';
import { toFormValues, toSubmitInput } from './types';

export default function InventoryProductPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const productQuery = useQuery(INVENTORY_PRODUCT_DETAIL, {
    variables: { id },
    skip: isNew,
    fetchPolicy: 'cache-and-network',
  });
  const categoriesQuery = useQuery(INVENTORY_CATEGORIES, { fetchPolicy: 'cache-first' });
  const logsQuery = useQuery(INVENTORY_ACTIVITY_LOGS, {
    variables: { id },
    skip: isNew,
    fetchPolicy: 'cache-and-network',
  });
  const movementsQuery = useQuery(INVENTORY_STOCK_MOVEMENTS, {
    variables: { id },
    skip: isNew,
    fetchPolicy: 'cache-and-network',
  });
  const analyticsQuery = useQuery(INVENTORY_ANALYTICS, {
    variables: { id },
    skip: isNew,
    fetchPolicy: 'cache-and-network',
  });

  const [createProduct] = useMutation(CREATE_PRODUCT);
  const [updateProduct] = useMutation(UPDATE_PRODUCT);

  const initialValues = useMemo(
    () => toFormValues(productQuery.data?.inventoryProduct),
    [productQuery.data]
  );
  const categories = (categoriesQuery.data?.categories ?? []).filter(
    (c: any) => c.level !== 'SUPER'
  );

  if (!isNew && productQuery.loading && !productQuery.data) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (!isNew && !productQuery.loading && !productQuery.data?.inventoryProduct) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">Product not found.</Alert>
        <Button sx={{ mt: 2 }} startIcon={<ArrowBackIcon />} onClick={() => navigate('/inventory')}>
          Back to inventory
        </Button>
      </Container>
    );
  }

  const product = productQuery.data?.inventoryProduct ?? null;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <ProductPageHeader
        isNew={isNew}
        product={product}
        onError={setError}
        onToast={setToast}
        onRefetch={productQuery.refetch}
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Formik
        initialValues={initialValues}
        enableReinitialize
        validationSchema={productSchema}
        validateOnChange
        onSubmit={async (values, helpers) => {
          setError(null);
          try {
            const input = toSubmitInput(values);
            if (id) {
              await updateProduct({ variables: { id, input } });
              setToast('Saved');
              await productQuery.refetch();
              helpers.resetForm({ values });
            } else {
              const res = await createProduct({ variables: { input } });
              const newId = res.data?.createInventoryProduct?.id;
              setToast('Created');
              if (newId) navigate(`/inventory/${newId}/edit`, { replace: true });
            }
          } catch (err: any) {
            setError(err?.message ?? 'Save failed');
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        <ProductFormBody
          isNew={isNew}
          categories={categories}
          logs={logsQuery.data?.inventoryActivityLogs ?? []}
          movements={movementsQuery.data?.inventoryStockMovements ?? []}
          analytics={analyticsQuery.data?.inventoryAnalytics ?? []}
          activityLoading={
            logsQuery.loading || movementsQuery.loading || analyticsQuery.loading
          }
          onCancel={() => navigate('/inventory')}
          onAfterSave={() => navigate('/inventory')}
          onError={setError}
        />
      </Formik>
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Container>
  );
}
