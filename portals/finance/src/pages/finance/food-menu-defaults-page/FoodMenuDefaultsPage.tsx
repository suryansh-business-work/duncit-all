import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, CircularProgress, Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import FoodTaxDefaultsForm, { type FoodTaxDefaultsOutput, type FoodTaxDefaultsValues } from './food-tax-defaults-form';
import {
  FOOD_TAX_DEFAULTS,
  UPDATE_FOOD_TAX_DEFAULTS,
  type FoodTaxDefaultsData,
  type UpdateFoodTaxDefaultsData,
  type UpdateFoodTaxDefaultsVars,
} from './queries';

/**
 * Finance → Food Menu Defaults. Whether venue food prices include GST or have
 * it added, and at what percent — for every venue that does not set its own
 * (a venue owner, or the Venues console, can override it per venue). A change
 * prices the NEXT order; an order already placed keeps the GST it was placed with.
 */
export default function FoodMenuDefaultsPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<FoodTaxDefaultsData>(FOOD_TAX_DEFAULTS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save, { loading: saving }] = useMutation<UpdateFoodTaxDefaultsData, UpdateFoodTaxDefaultsVars>(
    UPDATE_FOOD_TAX_DEFAULTS,
    { refetchQueries: [{ query: FOOD_TAX_DEFAULTS }] }
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const stored = data?.foodTaxDefaults;
  const values = useMemo<FoodTaxDefaultsValues | null>(
    () => (stored ? { tax_mode: stored.tax_mode, gst_pct: stored.gst_pct } : null),
    [stored]
  );

  const submit = async (output: FoodTaxDefaultsOutput) => {
    setSaveError(null);
    try {
      await save({ variables: { input: { tax_mode: output.tax_mode, gst_pct: output.gst_pct } } });
      notifySuccess(t('finance.foodMenuDefaults.saved'));
    } catch (e) {
      setSaveError(parseApiError(e));
    }
  };

  return (
    <Box>
      <PageHeader
        title={t('finance.foodMenuDefaults.title')}
        subtitle={t('finance.foodMenuDefaults.subtitle')}
        sx={{ mb: 3 }}
      />
      <Stack spacing={2}>
        <Alert severity="info">{t('finance.foodMenuDefaults.howItApplies')}</Alert>
        {loading && !values && (
          <Box sx={{ p: 6, textAlign: 'center' }} role="status" aria-label={t('finance.foodMenuDefaults.loading')}>
            <CircularProgress />
          </Box>
        )}
        {error && !values && (
          <Alert
            severity="error"
            data-testid="food-menu-defaults-load-error"
            action={
              <DuncitButton
                color="inherit"
                size="small"
                // A failed retry is not lost: the query's own `error` keeps this alert up with the new reason.
                onClick={() => {
                  refetch().catch(() => undefined);
                }}
              >
                {t('shell.common.retry')}
              </DuncitButton>
            }
          >
            {parseApiError(error)}
          </Alert>
        )}
        {values && (
          <Card variant="outlined">
            <CardContent>
              <FoodTaxDefaultsForm values={values} busy={saving} errorMessage={saveError} onSubmit={submit} />
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
