import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import type { CampaignNameValues } from '../campaign-name-form';
import { UPDATE_WA_PRICING, WA_PRICING, type WaCampaignNameOption, type WaPricing } from '../queries';
import CampaignNamesCard from './CampaignNamesCard';
import {
  WaPricingForm,
  fromWaPricing,
  toUpdateWaPricingInput,
  type WaPricingValues,
} from './wa-pricing-form';

interface Props {
  names: WaCampaignNameOption[];
  namesBusy: boolean;
  onAddName: (values: CampaignNameValues) => Promise<void>;
  onDeleteName: (option: WaCampaignNameOption) => void;
}

/**
 * What WhatsApp costs and what may be sent.
 *
 * A rate saved here applies to sends made from now on: every campaign freezes
 * the rate it was created under, so changing the card cannot rewrite what past
 * sends cost — the Logs keep saying what was actually spent.
 */
export default function WaSettings({
  names,
  namesBusy,
  onAddName,
  onDeleteName,
}: Readonly<Props>) {
  const { data, loading, error, refetch } = useQuery<{ waPricing: WaPricing }>(WA_PRICING, {
    fetchPolicy: 'cache-and-network',
  });
  const [updatePricing] = useMutation(UPDATE_WA_PRICING);
  const [busy, setBusy] = useState(false);

  const initialValues = useMemo(
    () => (data?.waPricing ? fromWaPricing(data.waPricing) : null),
    [data]
  );

  const save = async (values: WaPricingValues) => {
    setBusy(true);
    try {
      await updatePricing({ variables: { input: toUpdateWaPricingInput(values) } });
      notifySuccess('Rates saved — they apply to sends from now on');
      await refetch();
    } catch (e) {
      notifyError(parseApiError(e, 'Could not save the rates'));
    } finally {
      setBusy(false);
    }
  };

  let pricingCard = null;
  if (error) {
    pricingCard = <Alert severity="error">{parseApiError(error, 'Could not read the rates')}</Alert>;
  } else if (loading && !initialValues) {
    pricingCard = (
      <Stack alignItems="center" sx={{ py: 5 }}>
        <CircularProgress />
      </Stack>
    );
  } else if (initialValues) {
    pricingCard = (
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" fontWeight={800}>
              Message pricing
            </Typography>
            <Typography variant="body2" color="text.secondary">
              What one message costs, by the category WhatsApp bills on. A send freezes the rate it
              was created under, so past costs never move when these change.
            </Typography>
          </Stack>
          <WaPricingForm initialValues={initialValues} busy={busy} onSubmit={save} />
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {pricingCard}
      <CampaignNamesCard
        names={names}
        busy={namesBusy}
        onAdd={onAddName}
        onDelete={onDeleteName}
      />
    </Stack>
  );
}
