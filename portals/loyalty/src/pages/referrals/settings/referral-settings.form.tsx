import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Link, Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { RhfTextField } from '@duncit/forms';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { referralLink, renderReferralMessage } from '@duncit/utils';
import {
  makeReferralSettingsSchema,
  referralTokenList,
  toFormValues,
  type ReferralSettingsFormProps,
  type ReferralSettingsValues,
} from './referral-settings.types';

/** A stand-in code for the preview — a real one belongs to a real member. */
const SAMPLE_CODE = 'DUN-9F3A2C';

const panelSx = { p: 1.5, borderRadius: 1, bgcolor: 'action.hover' } as const;

/**
 * What a referral says, and — read-only — what it pays. The rate is shown
 * because the message beside it quotes it: a page that lets you write "earn 50
 * coins" without showing the rate is a page that lets the promise drift.
 */
export default function ReferralSettingsForm({
  settings,
  signupBaseUrl,
  busy,
  canWrite,
  errorMessage,
  onSubmit,
}: Readonly<ReferralSettingsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeReferralSettingsSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<ReferralSettingsValues>({
    defaultValues: toFormValues(settings),
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });

  // The preview reads the LIVE message as it is typed; the coin count is the
  // SAVED rate, because this page renders whatever Coin Settings pays today.
  const draft = useWatch({ control, name: 'share_message' });
  const preview = renderReferralMessage(draft, {
    code: SAMPLE_CODE,
    link: referralLink(SAMPLE_CODE, signupBaseUrl),
    coins: settings.coins_per_referral,
  });

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))} data-testid="referral-settings-form">
      <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <SectionCard title={t('loyalty.referrals.rewardTitle')} subtitle={t('loyalty.referrals.rewardSubtitle')}>
          <Stack spacing={2.5}>
            <Stack spacing={0.25} sx={panelSx}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                {t('loyalty.referrals.coinsPerReferral')}
              </Typography>
              <Typography component="p" variant="h6" sx={{ fontWeight: 700 }} data-testid="referral-rate">
                {settings.coins_per_referral}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('loyalty.referrals.rateHint')}{' '}
                <Link component={RouterLink} to="/duncit-coin/settings">
                  {t('loyalty.referrals.rateLink')}
                </Link>
              </Typography>
            </Stack>

            <RhfTextField
              control={control}
              name="share_message"
              label={t('finance.referrals.shareMessage')}
              size="small"
              multiline
              minRows={2}
              disabled={!canWrite}
              hint={t('loyalty.referrals.shareMessageHint', { vars: { tokens: referralTokenList } })}
              slotProps={{ htmlInput: { 'data-testid': 'referral-share-message' } }}
            />

            <Stack spacing={0.5} sx={panelSx} aria-live="polite">
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                {t('loyalty.referrals.preview')}
              </Typography>
              <Typography variant="body2" data-testid="referral-preview">
                {preview}
              </Typography>
            </Stack>

            <RhfTextField
              control={control}
              name="gift_description"
              label={t('finance.referrals.giftLineOptional')}
              size="small"
              disabled={!canWrite}
              hint={t('loyalty.referrals.giftLineHint')}
            />
          </Stack>
        </SectionCard>

        {canWrite ? (
          <Stack direction="row">
            <DuncitButton type="submit" variant="contained" disabled={!formState.isDirty || busy}>
              {busy ? t('loyalty.coin.saving') : t('loyalty.coin.saveSettings')}
            </DuncitButton>
          </Stack>
        ) : (
          <Alert severity="info">{t('loyalty.common.readOnly')}</Alert>
        )}
      </Stack>
    </form>
  );
}
