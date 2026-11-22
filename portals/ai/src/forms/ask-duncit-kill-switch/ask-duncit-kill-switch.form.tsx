import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { askDuncitKillSwitchDefaults, buildAskDuncitKillSwitchSchema, type AskDuncitKillSwitchFormProps, type AskDuncitKillSwitchValues } from './ask-duncit-kill-switch.types';

type KillResolver = Resolver<AskDuncitKillSwitchValues, unknown, AskDuncitKillSwitchValues>;

/** The reason for an emergency stop (RHF + Zod). */
export default function AskDuncitKillSwitchForm({ formId, onSubmit }: Readonly<AskDuncitKillSwitchFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildAskDuncitKillSwitchSchema(t), [t]);
  const { control, handleSubmit } = useForm<AskDuncitKillSwitchValues, unknown, AskDuncitKillSwitchValues>({
    defaultValues: askDuncitKillSwitchDefaults,
    resolver: zodResolver(schema) as unknown as KillResolver,
    mode: 'onTouched',
  });
  return (
    <Stack component="form" id={formId} noValidate onSubmit={handleSubmit(onSubmit)} sx={{ pt: 1 }} data-testid="ask-duncit-kill-switch-form">
      <RhfTextField control={control} name="reason" label={t('ai.askDuncit.control.killReason')} hint={t('ai.askDuncit.control.killReasonHint')} multiline minRows={2} fullWidth required />
    </Stack>
  );
}
