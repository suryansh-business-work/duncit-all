import type { Control } from 'react-hook-form';
import { Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { CoinSettingsForm } from './coin-settings.schema';
import CoinSettingField from './CoinSettingField';

interface Props {
  control: Control<CoinSettingsForm>;
}

/** How long a granted coin stays spendable. Saved with the payout rules — it
 * is one policy — but shown apart, because it decides how long coins last
 * rather than how many are given. */
export default function CoinExpiryCard({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('finance.duncitCoin.coinExpiryTitle')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('finance.duncitCoin.coinExpiryCaption')}
          </Typography>
        </Stack>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <CoinSettingField
              control={control}
              name="coin_expiry_days"
              label={t('finance.duncitCoin.coinExpiry')}
              unit={t('finance.duncitCoin.days')}
              helper={t('finance.duncitCoin.coinExpiryHelper')}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
