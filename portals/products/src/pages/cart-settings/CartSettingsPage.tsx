import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import {
  CartSettingsForm,
  toCartSettingsForm,
  toCartSettingsInput,
  type CartSettingsFormValues,
  type ProductCartSettings,
} from './cart-settings-form';
import { PRODUCT_CART_SETTINGS, UPDATE_PRODUCT_CART_SETTINGS } from './queries';

interface SettingsData {
  productCartSettings: ProductCartSettings;
}

/** Products > Cart > Cart Settings — the "your cart is calling" nudge on mWeb
 * and the app, and the cart reminder email. */
export default function CartSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery<SettingsData>(PRODUCT_CART_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save, { loading: saving }] = useMutation<{ updateProductCartSettings: ProductCartSettings }>(
    UPDATE_PRODUCT_CART_SETTINGS,
    { refetchQueries: [{ query: PRODUCT_CART_SETTINGS }] },
  );
  const settings = data?.productCartSettings;
  const initialValues = useMemo(() => (settings ? toCartSettingsForm(settings) : null), [settings]);

  const onSubmit = async (values: CartSettingsFormValues) => {
    try {
      await save({ variables: { input: toCartSettingsInput(values) } });
      notifySuccess(t('products.cartSettings.saved'));
    } catch (saveError) {
      logs.portal.products.error('CartSettingsPage', 'save', { error: saveError });
      notifyError(t('products.cartSettings.saveFailed'));
    }
  };

  let body;
  if (initialValues) {
    body = <CartSettingsForm initialValues={initialValues} saving={saving} onSubmit={onSubmit} />;
  } else if (loading) {
    body = (
      <Stack sx={{ alignItems: 'center', p: 4 }}>
        <CircularProgress aria-label={t('products.cartSettings.title')} />
      </Stack>
    );
  } else {
    body = (
      <Alert
        severity="error"
        action={
          <DuncitButton color="inherit" size="small" onClick={() => refetch().catch(() => undefined)}>
            {t('shell.common.retry')}
          </DuncitButton>
        }
      >
        {t('products.cartSettings.loadFailed')}
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
          {t('products.cartSettings.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('products.cartSettings.description')}
        </Typography>
      </Box>
      {body}
    </Stack>
  );
}
