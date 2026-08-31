import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useForm , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import CoinRatesCard from './CoinRatesCard';
import CoinGrantCard from './CoinGrantCard';
import {
  COIN_CURRENCY,
  COIN_SETTINGS,
  UPDATE_COIN_SETTINGS,
  type CoinSettings,
} from './queries';
import {
  BLANK_COIN_SETTINGS,
  coinSettingsSchema,
  toCoinSettingsForm,
  type CoinSettingsForm,
} from './coin-settings.schema';

/** Finance > Duncit Coin > Settings — every rule that decides how many coins
 * someone is given, plus the one-off adjustments no rule covers. */
export default function CoinSettingsPage() {
  const { data, loading, refetch } = useQuery<{ coinSettings: CoinSettings }>(COIN_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: currencyData } = useQuery<any>(COIN_CURRENCY);
  const [save, { loading: saving }] = useMutation<any>(UPDATE_COIN_SETTINGS);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState } = useForm<CoinSettingsForm, any, CoinSettingsForm>({
    resolver: zodResolver(coinSettingsSchema) as unknown as Resolver<CoinSettingsForm, any, CoinSettingsForm>,
    defaultValues: BLANK_COIN_SETTINGS,
    mode: 'onBlur',
  });

  const settings = data?.coinSettings;
  useEffect(() => {
    if (settings) reset(toCoinSettingsForm(settings));
  }, [settings, reset]);

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      await save({
        variables: {
          input: {
            pod_join_earn_pct: Number.parseInt(values.pod_join_earn_pct, 10),
            shop_earn_pct: Number.parseInt(values.shop_earn_pct, 10),
            coins_per_referral: Number.parseInt(values.coins_per_referral, 10),
            pod_feedback_coins: Number.parseInt(values.pod_feedback_coins, 10),
          },
        },
      });
      await refetch();
      notifySuccess('Coin settings saved');
    } catch (e: any) {
      setError(e.message ?? 'Could not save the coin settings.');
    }
  });

  if (loading && !data) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          mb: 3
        }}>
        <TuneIcon color="primary" sx={{ fontSize: 28 }} />
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            Coin Settings
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            When Duncit hands out coins, and how many.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        <CoinRatesCard
          control={control}
          currencySymbol={currencyData?.publicFinanceSettings?.currency_symbol ?? '₹'}
        />

        <Box>
          <DuncitButton
            variant="contained"
            disabled={!formState.isDirty || saving}
            onClick={() => {
              submit().catch(() => undefined);
            }}
          >
            {saving ? 'Saving…' : 'Save settings'}
          </DuncitButton>
        </Box>

        <CoinGrantCard
          onApplied={() => {
            refetch().catch(() => undefined);
          }}
        />
      </Stack>
    </Box>
  );
}
