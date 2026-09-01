import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import SellIcon from '@mui/icons-material/Sell';
import { notifySuccess } from '@duncit/dialogs';
import AdsPricingForm, {
  fromAdPricing,
  toUpdateAdPricingInput,
  type AdsPricingFormValues,
} from './ads-pricing-form';
import { AD_PRICING, UPDATE_AD_PRICING } from './queries';
import { useTranslation } from '@duncit/app-settings';

export default function AdsSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<any>(AD_PRICING);
  const [updateMut] = useMutation<any>(UPDATE_AD_PRICING);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const initialValues = useMemo(
    () => (data?.adPricing ? fromAdPricing(data.adPricing) : null),
    [data],
  );

  const save = async (values: AdsPricingFormValues) => {
    setBusy(true);
    setOpError(null);
    try {
      await updateMut({ variables: { input: toUpdateAdPricingInput(values) } });
      notifySuccess('Ad pricing updated');
      await refetch();
    } catch (e) {
      /* v8 ignore next -- Apollo rejects with an Error carrying a message; the non-Error fallback is defensive */
      setOpError(e instanceof Error ? e.message : t('marketing.adsSettings.failedToUpdateAdPricing'));
    } finally {
      setBusy(false);
    }
  };

  let body = null;
  if (error) {
    body = <Alert severity="error">{error.message}</Alert>;
  } else if (loading || !initialValues) {
    body = (
      <Stack
        sx={{
          alignItems: "center",
          py: 6
        }}>
        <CircularProgress />
      </Stack>
    );
  } else {
    body = (
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <AdsPricingForm
          initialValues={initialValues}
          busy={busy}
          errorMessage={opError}
          onSubmit={save}
        />
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: "center"
      }}>
        <SellIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            Ads Settings
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Per-day placement pricing used to quote every ad request. Approved ads keep the cost
            frozen at approval time.
          </Typography>
        </Box>
      </Stack>
      {body}
    </Stack>
  );
}
