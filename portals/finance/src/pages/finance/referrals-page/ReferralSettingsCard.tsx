import { Controller, type Control } from 'react-hook-form';
import { Card, CardContent, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { REFERRAL_MESSAGE_TOKENS } from '@duncit/utils';
import type { ReferralSettingsForm } from './referral-settings.schema';

interface Props {
  control: Control<ReferralSettingsForm>;
  /** Rendered with today's saved rate, so Finance sees what members will read. */
  preview: string;
}

const TOKEN_HINT = `Placeholders: ${REFERRAL_MESSAGE_TOKENS.join(', ')}`;

/**
 * What a referral pays and what it says, on one form and saved together.
 *
 * They describe the same promise, and one changed without the other is a
 * promise that lies — a message offering fifty coins beside a rate somebody
 * quietly set to ten.
 */
export default function ReferralSettingsCard({ control, preview }: Readonly<Props>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700}>
          Reward &amp; message
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Both sides of a referral earn this — the member who shared their code and the member who
          signed up with it.
        </Typography>

        <Stack spacing={2.5} sx={{ mt: 2 }}>
          <Controller
            name="coins_per_referral"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Coins per referral"
                required
                size="small"
                inputMode="numeric"
                sx={{ maxWidth: 280 }}
                error={!!fieldState.error}
                helperText={
                  fieldState.error?.message ??
                  'Paid to each side the moment the code is redeemed.'
                }
                InputProps={{
                  endAdornment: <InputAdornment position="end">coins</InputAdornment>,
                }}
              />
            )}
          />

          <Controller
            name="share_message"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Share message"
                size="small"
                multiline
                minRows={2}
                error={!!fieldState.error}
                helperText={
                  fieldState.error?.message ??
                  `${TOKEN_HINT}. Leave empty to use the app's built-in message.`
                }
              />
            )}
          />

          <Stack
            spacing={0.5}
            sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}
            aria-live="polite"
          >
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              PREVIEW
            </Typography>
            <Typography variant="body2">{preview}</Typography>
          </Stack>

          <Controller
            name="gift_description"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Gift line (optional)"
                size="small"
                error={!!fieldState.error}
                helperText={
                  fieldState.error?.message ??
                  'An extra line shown on every member’s Refer & Earn screen. Leave empty to hide it.'
                }
              />
            )}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
