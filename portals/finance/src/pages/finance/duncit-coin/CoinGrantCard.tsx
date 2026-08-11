import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import CoinUserPicker from './CoinUserPicker';
import { ADJUST_USER_COINS, type CoinUserOption } from './queries';
import { BLANK_GRANT, coinGrantSchema, type CoinGrantForm } from './coin-grant.schema';

const DIRECTIONS = [
  { value: 'GRANT', label: 'Grant coins' },
  { value: 'DEDUCT', label: 'Deduct coins' },
] as const;

interface Props {
  /** Lets the page refresh the ledger and the headline totals after a change. */
  onApplied: () => void;
}

/**
 * A coin movement for one named person — the goodwill credit, the correction,
 * the compensation no automatic rule covers.
 *
 * The user is picked rather than typed, and the reason is mandatory: this is the
 * only place on the platform where coins appear without a payment or a referral
 * behind them, so the row it writes has to explain itself.
 */
export default function CoinGrantCard({ onApplied }: Readonly<Props>) {
  const [user, setUser] = useState<CoinUserOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adjust, { loading }] = useMutation(ADJUST_USER_COINS);

  const { control, handleSubmit, reset } = useForm<CoinGrantForm>({
    resolver: zodResolver(coinGrantSchema),
    defaultValues: BLANK_GRANT,
    mode: 'onBlur',
  });

  const apply = handleSubmit(async (values) => {
    setError(null);
    if (!user) {
      setError('Choose the account this applies to.');
      return;
    }
    try {
      const res = await adjust({
        variables: {
          user_id: user.id,
          direction: values.direction,
          coins: Number.parseInt(values.coins, 10),
          reason: values.reason,
        },
      });
      const balance = res.data?.adjustUserCoins?.balance ?? 0;
      notifySuccess(`${user.full_name || user.email} now holds ${balance} coins`);
      reset(BLANK_GRANT);
      setUser(null);
      onApplied();
    } catch (e: any) {
      setError(e.message ?? 'Could not apply the adjustment.');
    }
  });

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Give one member coins
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Applies immediately and writes a ledger row naming you. A deduction can never take a
            balance below zero.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <CoinUserPicker value={user} onChange={setUser} disabled={loading} />
          </Grid>
          <Grid item xs={6} md={3}>
            <Controller
              name="direction"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Action" fullWidth size="small">
                  {DIRECTIONS.map((d) => (
                    <MenuItem key={d.value} value={d.value}>
                      {d.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <Controller
              name="coins"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Coins"
                  required
                  fullWidth
                  size="small"
                  inputMode="numeric"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">coins</InputAdornment>,
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <Controller
              name="reason"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Reason"
                  required
                  fullWidth
                  size="small"
                  error={!!fieldState.error}
                  helperText={
                    fieldState.error?.message ??
                    'Shown on the ledger row. Write it for someone reading it a year from now.'
                  }
                />
              )}
            />
          </Grid>
        </Grid>

        <Stack direction="row" sx={{ mt: 2 }}>
          <Button
            variant="contained"
            disabled={loading}
            onClick={() => {
              apply().catch(() => undefined);
            }}
          >
            {loading ? 'Applying…' : 'Apply adjustment'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
