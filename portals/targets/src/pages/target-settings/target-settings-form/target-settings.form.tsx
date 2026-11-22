import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, FormControlLabel, FormHelperText, Stack, Switch } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { targetSettingsSchema, toFormValues } from './target-settings.schema';
import type { TargetSettingsFormProps, TargetSettingsFormValues, TargetSettingsOutput } from './target-settings.types';

/**
 * When employees are reminded to report on their month: on or off, how many of
 * the month's last days remind, and how many days into the next month the
 * reminders continue while a target is still unsubmitted.
 */
export default function TargetSettingsForm({ initial, onSubmit }: Readonly<TargetSettingsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => targetSettingsSchema(t), [t]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<TargetSettingsFormValues, unknown, TargetSettingsOutput>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(initial),
  });

  useEffect(() => {
    reset(toFormValues(initial));
  }, [initial, reset]);

  return (
    <Stack spacing={2} component="form" noValidate onSubmit={handleSubmit(onSubmit)} data-testid="target-settings-form">
      <Controller
        control={control}
        name="reminders_enabled"
        render={({ field }) => (
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(_event, checked) => field.onChange(checked)}
                  slotProps={{ input: { 'aria-describedby': 'target-settings-enabled-hint' } }}
                  data-testid="target-settings-enabled"
                />
              }
              label={t('employeeTargets.settings.enabled')}
            />
            <FormHelperText id="target-settings-enabled-hint">{t('employeeTargets.settings.enabledHint')}</FormHelperText>
          </Box>
        )}
      />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <RhfTextField
          control={control}
          name="reminder_days_before_end"
          label={t('employeeTargets.settings.daysBefore')}
          hint={t('employeeTargets.settings.daysBeforeHint')}
          required
          slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'target-settings-days-before' } }}
        />
        <RhfTextField
          control={control}
          name="reminder_grace_days"
          label={t('employeeTargets.settings.grace')}
          hint={t('employeeTargets.settings.graceHint')}
          required
          slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'target-settings-grace' } }}
        />
      </Box>
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton
          type="submit"
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={isSubmitting || !isDirty}
          data-testid="target-settings-save"
        >
          {t('employeeTargets.settings.save')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
