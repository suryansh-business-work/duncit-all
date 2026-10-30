import { useId, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Card, CardContent, FormControlLabel, FormHelperText, Stack, Switch } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import {
  SMART_INCENTIVE_DELAY_MAX_SECONDS,
  SMART_INCENTIVE_DELAY_MIN_SECONDS,
  SMART_INCENTIVE_MAX_PCT_CEILING,
  makeSmartIncentiveSettingsSchema,
  toFormValues,
  toSettingsInput,
  type SmartIncentiveSettingsFormProps,
  type SmartIncentiveSettingsValues,
} from './smart-incentive-settings.types';

/** Both numbers are typed as digits, so a phone or tablet opens its number pad. */
const NUMBER_PAD = { htmlInput: { inputMode: 'numeric' } } as const;

/**
 * The programme's switch, how long a member stays on a pod page before the
 * offer shows, and the biggest discount a host may choose. A read-only seat
 * sees the same form with every control disabled, and is told why up front.
 */
export default function SmartIncentiveSettingsForm({
  settings,
  canWrite,
  busy,
  errorMessage,
  onSubmit,
}: Readonly<SmartIncentiveSettingsFormProps>) {
  const { t } = useTranslation();
  const enabledHintId = useId();
  const schema = useMemo(() => makeSmartIncentiveSettingsSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<SmartIncentiveSettingsValues>({
    defaultValues: toFormValues(settings),
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(toSettingsInput(values, settings)))}
      data-testid="smart-incentive-settings-form"
    >
      <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
        {!canWrite && <Alert severity="info">{t('loyalty.common.readOnly')}</Alert>}
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2.5}>
              <Controller
                control={control}
                name="enabled"
                render={({ field: { value, onChange, onBlur } }) => (
                  <div>
                    <FormControlLabel
                      label={t('loyalty.smartIncentive.enabledLabel')}
                      control={
                        <Switch
                          checked={value}
                          onChange={(_, checked) => onChange(checked)}
                          onBlur={onBlur}
                          disabled={!canWrite}
                          slotProps={{ input: { 'aria-describedby': enabledHintId } }}
                          data-testid="smart-incentive-enabled"
                        />
                      }
                    />
                    <FormHelperText id={enabledHintId} sx={{ mt: 0 }}>
                      {t('loyalty.smartIncentive.enabledHint')}
                    </FormHelperText>
                  </div>
                )}
              />
              <RhfTextField
                control={control}
                name="delay_seconds"
                label={t('loyalty.smartIncentive.delayLabel')}
                hint={t('loyalty.smartIncentive.delayHint', {
                  vars: { min: SMART_INCENTIVE_DELAY_MIN_SECONDS, maxSeconds: SMART_INCENTIVE_DELAY_MAX_SECONDS },
                })}
                required
                size="small"
                disabled={!canWrite}
                slotProps={NUMBER_PAD}
                data-testid="smart-incentive-delay"
              />
              <RhfTextField
                control={control}
                name="max_discount_pct"
                label={t('loyalty.smartIncentive.maxLabel')}
                hint={t('loyalty.smartIncentive.maxHint', { vars: { ceiling: SMART_INCENTIVE_MAX_PCT_CEILING } })}
                required
                size="small"
                disabled={!canWrite}
                slotProps={NUMBER_PAD}
                data-testid="smart-incentive-max"
              />
            </Stack>
          </CardContent>
        </Card>
        {canWrite && (
          <Stack direction="row">
            <DuncitButton type="submit" variant="contained" disabled={busy || !formState.isDirty}>
              {busy ? t('loyalty.coin.saving') : t('loyalty.coin.saveSettings')}
            </DuncitButton>
          </Stack>
        )}
      </Stack>
    </form>
  );
}
