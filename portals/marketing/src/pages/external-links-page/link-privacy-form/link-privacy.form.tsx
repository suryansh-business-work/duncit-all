import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormControlLabel, FormHelperText, Grid, Stack, Switch } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { FormActionsRow } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import {
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  linkPrivacySchema,
  policyToValues,
  type LinkPrivacyFormProps,
  type LinkPrivacyFormValues,
} from './link-privacy.types';

export { linkPrivacySchema, policyToValues, toPolicyInput } from './link-privacy.types';

/** The one form behind Marketing → External Links → Privacy & GDPR. */
export default function LinkPrivacyForm({
  policy,
  busy,
  errorMessage,
  onSubmit,
}: Readonly<LinkPrivacyFormProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, formState } = useForm<
    LinkPrivacyFormValues,
    any,
    LinkPrivacyFormValues
  >({
    defaultValues: policyToValues(policy),
    resolver: zodResolver(linkPrivacySchema(t)) as unknown as Resolver<
      LinkPrivacyFormValues,
      any,
      LinkPrivacyFormValues
    >,
    mode: 'onChange',
  });

  // Read both now: react-hook-form only tracks a formState flag that was read while rendering, and `!isValid || …` would skip isDirty until validation lands.
  const { isValid, isDirty } = formState;
  const submit = handleSubmit((values) => onSubmit(values));
  const retentionHint = t('marketing.externalLinks.keepClicksHint', {
    vars: { min: String(MIN_RETENTION_DAYS), max: String(MAX_RETENTION_DAYS) },
  });

  return (
    <form noValidate onSubmit={submit}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RhfTextField
            control={control}
            name="retention_days"
            label={t('marketing.externalLinks.keepClicksFor')}
            type="number"
            required
            hint={retentionHint}
            data-testid="link-privacy-retention-days"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            control={control}
            name="honour_consent_signals"
            render={({ field }) => (
              <Stack>
                <FormControlLabel
                  label={t('marketing.externalLinks.obeyConsentSignals')}
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      onBlur={field.onBlur}
                      slotProps={{ input: { 'aria-describedby': 'consent-signals-hint' } }}
                      data-testid="link-privacy-consent-signals"
                    />
                  }
                />
                <FormHelperText id="consent-signals-hint">
                  {t('marketing.externalLinks.obeyConsentHint')}
                </FormHelperText>
              </Stack>
            )}
          />
        </Grid>

        <Grid size={12}>
          <RhfTextField
            control={control}
            name="blocked_domains"
            label={t('marketing.externalLinks.blockedDomains')}
            multiline
            minRows={4}
            hint={t('marketing.externalLinks.blockedDomainsHint')}
            data-testid="link-privacy-blocked-domains"
          />
        </Grid>

        <FormActionsRow
          errorMessage={errorMessage}
          busy={busy}
          disabled={!isValid || !isDirty}
          submitLabel={t('marketing.externalLinks.savePrivacy')}
        />
      </Grid>
    </form>
  );
}
