import { Controller, type Control } from 'react-hook-form';
import {
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { CoinSettingsForm } from './coin-settings.schema';
import { useTranslation } from '@duncit/app-settings';

interface RateField {
  name: keyof CoinSettingsForm;
  label: string;
  unit: string;
  helper: string;
}

/** The three payout rules, in the order money reaches a member: they join a pod,
 * they buy something, or they bring somebody in. */
type Translate = ReturnType<typeof useTranslation>['t'];

const fields = (t: Translate): readonly RateField[] => [
  {
    name: 'pod_join_earn_pct',
    label: t('finance.duncitCoin.podJoinEarnRate'),
    unit: '%',
    helper: 'Share of a pod ticket paid back as coins. 0 turns it off.',
  },
  {
    name: 'shop_earn_pct',
    label: t('finance.duncitCoin.shopEarnRate'),
    unit: '%',
    helper: 'Share of a shop order paid back as coins. 0 turns it off.',
  },
  {
    name: 'coins_per_referral',
    label: t('finance.duncitCoin.coinsPerReferral'),
    unit: 'coins',
    helper: 'Paid to EACH side — the member who shared and the one who signed up.',
  },
];

interface Props {
  control: Control<CoinSettingsForm>;
  currencySymbol: string;
}

export default function CoinRatesCard({ control, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{
            fontWeight: 700
          }}>
            What Duncit pays out
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            1 coin = {currencySymbol}1 of reward value, spendable at checkout. A rate is read at the
            moment it is earned and never re-read, so changing it here never rewrites what somebody
            has already been paid.
          </Typography>
        </Stack>

        <Grid container spacing={2}>
          {fields(t).map((f) => (
            <Grid
              key={f.name}
              size={{
                xs: 12,
                sm: 4
              }}>
              <Controller
                name={f.name}
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label={f.label}
                    required
                    fullWidth
                    size="small"
                    inputMode="numeric"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? f.helper}
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">{f.unit}</InputAdornment>,
                      }
                    }}
                  />
                )}
              />
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}
