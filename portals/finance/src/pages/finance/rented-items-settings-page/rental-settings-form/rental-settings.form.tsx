import { useEffect, useId, useMemo } from 'react';
import { Controller, useForm, type Control, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, FormControlLabel, FormHelperText, FormLabel, Stack, Switch } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { DuncitButton } from '@duncit/buttons';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { useTranslation } from '@duncit/app-settings';
import { makeRentalSettingsSchema, RENTAL_SETTINGS_LIMITS } from './rental-settings.schema';
import type { RentalSettingsFormProps, RentalSettingsOutput, RentalSettingsValues } from './rental-settings.types';

type SwitchName = 'enabled' | 'rent_refundable_on_backout' | 'deposit_refundable';

/** One on/off rule, with the sentence that says what it does. */
function SwitchField({
  control,
  name,
  label,
  hint,
}: Readonly<{ control: Control<RentalSettingsValues>; name: SwitchName; label: string; hint: string }>) {
  const hintId = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Stack spacing={0.25}>
          <FormControlLabel
            control={
              <Switch
                checked={field.value}
                onChange={(_e, checked) => field.onChange(checked)}
                onBlur={field.onBlur}
                slotProps={{ input: { 'aria-describedby': hintId } }}
                data-testid={`rental-settings-${name}`}
              />
            }
            label={label}
          />
          <FormHelperText id={hintId} sx={{ mt: 0 }}>
            {hint}
          </FormHelperText>
        </Stack>
      )}
    />
  );
}

/** Finance's rules for every rented item: the switch, the terms, the money and the clock. */
export default function RentalSettingsForm({ values, busy, errorMessage, onSubmit }: Readonly<RentalSettingsFormProps>) {
  const { t } = useTranslation();
  const termsLabelId = useId();
  const schema = useMemo(() => makeRentalSettingsSchema(t), [t]);
  const { control, handleSubmit, reset, formState } = useForm<RentalSettingsValues, unknown, RentalSettingsOutput>({
    defaultValues: values,
    resolver: zodResolver(schema) as unknown as Resolver<RentalSettingsValues, unknown, RentalSettingsOutput>,
    mode: 'onBlur',
  });

  // A save answers with what was stored; the form re-opens on it, clean.
  useEffect(() => {
    reset(values);
  }, [values, reset]);

  const { commission, cutoffHours, autoReleaseDays } = RENTAL_SETTINGS_LIMITS;
  return (
    <form noValidate onSubmit={handleSubmit((output) => onSubmit(output))} data-testid="rental-settings-form">
      <Stack spacing={3} sx={{ maxWidth: 720 }}>
        {errorMessage && (
          <Alert severity="error" data-testid="rental-settings-error">
            {errorMessage}
          </Alert>
        )}

        <SwitchField
          control={control}
          name="enabled"
          label={t('finance.rentedItems.enabled')}
          hint={t('finance.rentedItems.enabledHint')}
        />

        <Controller
          control={control}
          name="terms_html"
          render={({ field, fieldState }) => (
            <Stack spacing={0.75} role="group" aria-labelledby={termsLabelId}>
              <FormLabel id={termsLabelId}>{t('finance.rentedItems.terms')}</FormLabel>
              <DuncitRichTextInput
                value={field.value ?? ''}
                onChange={(html) => field.onChange(html)}
                ariaLabel={t('finance.rentedItems.terms')}
                aiContext={t('finance.rentedItems.termsAiContext')}
                imageFolder="/finance/rentals"
                minHeight={180}
              />
              <FormHelperText error={Boolean(fieldState.error)}>
                {fieldState.error?.message ?? t('finance.rentedItems.termsHint')}
              </FormHelperText>
            </Stack>
          )}
        />

        <RhfTextField
          control={control}
          name="commission_pct"
          label={t('finance.rentedItems.commission')}
          hint={t('finance.rentedItems.commissionHint')}
          type="number"
          fullWidth={false}
          sx={{ maxWidth: 220 }}
          slotProps={{ htmlInput: { min: commission.min, max: commission.max, step: 0.5 } }}
          data-testid="rental-settings-commission"
        />

        <SwitchField
          control={control}
          name="rent_refundable_on_backout"
          label={t('finance.rentedItems.rentRefundable')}
          hint={t('finance.rentedItems.rentRefundableHint')}
        />
        <SwitchField
          control={control}
          name="deposit_refundable"
          label={t('finance.rentedItems.depositRefundable')}
          hint={t('finance.rentedItems.depositRefundableHint')}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RhfTextField
            control={control}
            name="booking_cutoff_hours"
            label={t('finance.rentedItems.cutoff')}
            hint={t('finance.rentedItems.cutoffHint')}
            type="number"
            slotProps={{ htmlInput: { min: cutoffHours.min, max: cutoffHours.max, step: 1 } }}
            data-testid="rental-settings-cutoff"
          />
          <RhfTextField
            control={control}
            name="deposit_auto_release_days"
            label={t('finance.rentedItems.autoRelease')}
            hint={t('finance.rentedItems.autoReleaseHint')}
            type="number"
            slotProps={{ htmlInput: { min: autoReleaseDays.min, max: autoReleaseDays.max, step: 1 } }}
            data-testid="rental-settings-auto-release"
          />
        </Stack>

        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton
            type="submit"
            variant="contained"
            loading={busy}
            disabled={!formState.isDirty || busy}
            data-testid="rental-settings-save"
          >
            {busy ? t('shell.common.saving') : t('shell.common.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
