import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Divider, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import JourneyPicker from './JourneyPicker';
import PresetPicker from './PresetPicker';
import {
  defaultValues,
  newStressRunSchema,
  plannedSeconds,
  presetValues,
  type ConfirmRule,
  type NewStressRunValues,
  type StressPresetKey,
} from './new-stress-run.types';
import { formatSeconds } from '../labels';
import type { StressTriggerConfig } from '../queries';

interface Props {
  config: StressTriggerConfig;
  onSubmit: (values: NewStressRunValues) => void;
}

/** Submits this form from outside it — the dialog owns the action buttons. */
export const NEW_STRESS_RUN_FORM_ID = 'stress-new-run-form';

type NumberField = Exclude<keyof NewStressRunValues, 'journeys' | 'confirm_text'>;

export default function NewStressRunForm({ config, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const limits = config.limits;
  const confirm = useMemo<ConfirmRule>(
    () => ({ required: config.requires_confirmation, text: config.confirm_text }),
    [config.requires_confirmation, config.confirm_text]
  );
  const [preset, setPreset] = useState<StressPresetKey | null>('smoke');

  const schema = useMemo(
    () =>
      newStressRunSchema(limits, confirm, {
        whole: t('tech.stress.vWhole'),
        usersRange: t('tech.stress.vUsersRange', { vars: { max: limits.max_virtual_users } }),
        botsRange: t('tech.stress.vBotsRange', { vars: { max: limits.max_browser_bots } }),
        runnersRange: t('tech.stress.vRunnersRange', { vars: { max: limits.max_runners } }),
        runnersAboveUsers: t('tech.stress.vRunnersAboveUsers'),
        rampUpRange: t('tech.stress.vRampUpRange'),
        holdRange: t('tech.stress.vHoldRange'),
        rampDownRange: t('tech.stress.vRampDownRange'),
        thinkRange: t('tech.stress.vThinkRange'),
        journeysRequired: t('tech.stress.vJourneysRequired'),
        tooLong: t('tech.stress.vTooLong', { vars: { minutes: limits.max_duration_minutes } }),
        confirmMismatch: t('tech.stress.vConfirmMismatch', { vars: { text: config.confirm_text } }),
      }),
    [limits, confirm, t]
  );

  const { control, handleSubmit, reset, getValues } = useForm<NewStressRunValues, unknown, NewStressRunValues>({
    defaultValues: defaultValues(limits, config.journeys),
    resolver: zodResolver(schema) as unknown as Resolver<NewStressRunValues, unknown, NewStressRunValues>,
    mode: 'all',
  });
  const watched = useWatch({ control });

  const pickPreset = (key: StressPresetKey) => {
    setPreset(key);
    reset({ ...getValues(), ...presetValues(key, limits) });
  };

  const numberField = (name: NumberField, label: string, hint: string) => (
    <RhfTextField
      control={control}
      name={name}
      label={label}
      hint={hint}
      type="number"
      slotProps={{ htmlInput: { inputMode: 'numeric', min: 0 } }}
    />
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate id={NEW_STRESS_RUN_FORM_ID}>
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <PresetPicker value={preset} onPick={pickPreset} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
          {numberField('virtual_users', t('tech.stress.fUsers'), t('tech.stress.fUsersHint', { vars: { max: limits.max_virtual_users } }))}
          {numberField('browser_bots', t('tech.stress.fBots'), t('tech.stress.fBotsHint', { vars: { max: limits.max_browser_bots } }))}
          {numberField('runners', t('tech.stress.fRunners'), t('tech.stress.fRunnersHint', { vars: { max: limits.max_runners } }))}
          {numberField('ramp_up_seconds', t('tech.stress.fRampUp'), t('tech.stress.fRampUpHint'))}
          {numberField('hold_seconds', t('tech.stress.fHold'), t('tech.stress.fHoldHint'))}
          {numberField('ramp_down_seconds', t('tech.stress.fRampDown'), t('tech.stress.fRampDownHint'))}
          {numberField('think_time_ms', t('tech.stress.fThink'), t('tech.stress.fThinkHint'))}
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tech.stress.plannedDuration', {
            vars: { duration: formatSeconds(plannedSeconds(watched)), max: limits.max_duration_minutes },
          })}
        </Typography>
        <Controller
          control={control}
          name="journeys"
          render={({ field, fieldState }) => (
            <JourneyPicker
              journeys={config.journeys}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        {confirm.required && (
          <>
            <Divider />
            <Alert severity="error">{t('tech.stress.productionWarning')}</Alert>
            <RhfTextField
              control={control}
              name="confirm_text"
              label={t('tech.stress.fConfirm', { vars: { text: config.confirm_text } })}
              hint={t('tech.stress.fConfirmHint')}
              autoComplete="off"
            />
          </>
        )}
      </Stack>
    </form>
  );
}
