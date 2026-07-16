import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import SellIcon from '@mui/icons-material/Sell';
import { notifySuccess } from '@duncit/dialogs';
import AdsPricingForm, {
  fromAdPricing,
  toUpdateAdPricingInput,
  type AdsPricingFormValues,
} from './ads-pricing-form';
import { AD_PRICING, UPDATE_AD_PRICING } from './queries';

export default function AdsSettingsPage() {
  const { data, loading, error, refetch } = useQuery(AD_PRICING);
  const [updateMut] = useMutation(UPDATE_AD_PRICING);
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
      setOpError(e instanceof Error ? e.message : 'Failed to update ad pricing');
    } finally {
      setBusy(false);
    }
  };

  let body = null;
  if (error) {
    body = <Alert severity="error">{error.message}</Alert>;
  } else if (loading || !initialValues) {
    body = (
      <Stack alignItems="center" sx={{ py: 6 }}>
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
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <SellIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Ads Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Per-day placement pricing used to quote every ad request. Approved ads keep the cost
            frozen at approval time.
          </Typography>
        </Box>
      </Stack>
      {body}
    </Stack>
  );
}
