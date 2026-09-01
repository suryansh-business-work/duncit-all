import { Controller, type Control } from 'react-hook-form';
import { Link as RouterLink } from 'react-router';
import { Card, CardContent, Link, Stack, TextField, Typography } from '@mui/material';
import { REFERRAL_MESSAGE_TOKENS } from '@duncit/utils';
import type { ReferralSettingsForm } from './referral-settings.schema';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  control: Control<ReferralSettingsForm>;
  /** Rendered with today's saved rate, so Finance sees what members will read. */
  preview: string;
  /** The live rate, shown but not edited here — see the note below. */
  coinsPerReferral: number;
}

const TOKEN_HINT = `Placeholders: ${REFERRAL_MESSAGE_TOKENS.join(', ')}`;

/**
 * What a referral says, and — read-only — what it pays.
 *
 * The rate is one of the coin payout rules and is set with the others on Duncit
 * Coin > Settings. It is still shown here because the message beside it quotes
 * it: a page that lets you write "earn 50 coins" without showing you the rate is
 * a page that lets the promise drift.
 */
export default function ReferralSettingsCard({
  control,
  preview,
  coinsPerReferral,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" sx={{
          fontWeight: 700
        }}>
          Reward &amp; message
        </Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          Both sides of a referral earn this — the member who shared their code and the member who
          signed up with it.
        </Typography>

        <Stack spacing={2.5} sx={{ mt: 2 }}>
          <Stack spacing={0.25} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 700
              }}>
              COINS PER REFERRAL
            </Typography>
            <Typography variant="h6" sx={{
              fontWeight: 700
            }}>
              {coinsPerReferral}
            </Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              Paid to each side the moment the code is redeemed. Change it in{' '}
              <Link component={RouterLink} to="/duncit-coin/settings">
                Duncit Coin &rsaquo; Coin Settings
              </Link>
              , where every coin payout rule lives.
            </Typography>
          </Stack>

          <Controller
            name="share_message"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={t('finance.referrals.shareMessage')}
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
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 700
              }}>
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
                label={t('finance.referrals.giftLineOptional')}
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
