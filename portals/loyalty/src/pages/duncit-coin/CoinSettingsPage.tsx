import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import PageHeading from '../../components/PageHeading';
import { useCurrencySymbol } from '../../lib/useCurrencySymbol';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import CoinRatesCard from './CoinRatesCard';
import CoinExpiryCard from './CoinExpiryCard';
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

/** Loyalty > Duncit Coin > Coin Settings — every rule that decides how many coins
 * someone is given, plus the one-off adjustments no rule covers. */
export default function CoinSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery<{ coinSettings: CoinSettings }>(COIN_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const currencySymbol = useCurrencySymbol(COIN_CURRENCY);
  const [save, { loading: saving }] = useMutation(UPDATE_COIN_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const schema = useMemo(() => coinSettingsSchema(t), [t]);

  const { control, handleSubmit, reset, formState } = useForm<CoinSettingsForm, unknown, CoinSettingsForm>({
    resolver: zodResolver(schema) as unknown as Resolver<CoinSettingsForm, unknown, CoinSettingsForm>,
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
            coin_expiry_days: Number.parseInt(values.coin_expiry_days, 10),
            coin_expiry_reminder_days: Number.parseInt(values.coin_expiry_reminder_days, 10),
          },
        },
      });
      await refetch();
      notifySuccess(t('loyalty.coin.settingsSaved'));
    } catch (e) {
      setError(parseApiError(e, t('loyalty.coin.settingsSaveError')));
    }
  });

  if (loading && !data) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <PageHeading
        icon={<TuneIcon color="primary" sx={{ fontSize: 28 }} />}
        title={t('shell.nav.coinSettings')}
        subtitle={t('loyalty.coin.settingsSubtitle')}
      />

      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        <CoinRatesCard
          control={control}
          currencySymbol={currencySymbol}
        />

        <CoinExpiryCard control={control} />

        <Box>
          <DuncitButton
            variant="contained"
            disabled={!formState.isDirty || saving}
            onClick={() => {
              submit().catch(() => undefined);
            }}
          >
            {saving ? t('loyalty.coin.saving') : t('loyalty.coin.saveSettings')}
          </DuncitButton>
        </Box>

        <CoinGrantCard
          onApplied={() => {
            refetch().catch(() => undefined);
          }}
        />
      </Stack>
    </Stack>
  );
}
