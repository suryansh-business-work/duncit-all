import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Chip, Stack, Typography } from '@mui/material';
import { ASK_DUNCIT_HANDOVER_SUMMARY_MAX, ASK_DUNCIT_HANDOVER_TEAMS, handoverTeamKey } from '@duncit/utils';
import RhfTextField from '../../../forms/components/RhfTextField';
import { askDuncitHandoverDefaults, makeAskDuncitHandoverSchema, type AskDuncitHandoverValues } from './ask-duncit-handover.types';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  /** The dialog's submit button lives outside the form and targets it by id. */
  formId: string;
  /** Resolves true when the ticket was raised. */
  onSubmit: (values: AskDuncitHandoverValues) => Promise<boolean>;
}

type HandoverResolver = Resolver<AskDuncitHandoverValues, unknown, AskDuncitHandoverValues>;

/** Which team, and what the person needs (RHF + Zod + MUI). */
export default function AskDuncitHandoverForm({ formId, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeAskDuncitHandoverSchema(t), [t]);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AskDuncitHandoverValues, unknown, AskDuncitHandoverValues>({
    defaultValues: askDuncitHandoverDefaults,
    resolver: zodResolver(schema) as unknown as HandoverResolver,
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    const ok = await onSubmit(values);
    if (!ok) setError('root', { message: t('askDuncit.handover.failed') });
  });

  return (
    <Stack component="form" id={formId} noValidate onSubmit={submit} spacing={2} data-testid="ask-duncit-handover-form">
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('askDuncit.handover.intro')}
      </Typography>
      <Controller
        control={control}
        name="team"
        render={({ field, fieldState }) => (
          <Stack spacing={0.75}>
            <Typography id="ask-duncit-team-label" variant="subtitle2" sx={{ color: 'text.secondary' }}>
              {t('askDuncit.handover.teamLabel')}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap role="group" aria-labelledby="ask-duncit-team-label" sx={{ flexWrap: 'wrap' }}>
              {ASK_DUNCIT_HANDOVER_TEAMS.map((team) => (
                <Chip
                  key={team}
                  label={t(handoverTeamKey(team))}
                  data-testid={`ask-duncit-team-${team}`}
                  color={field.value === team ? 'primary' : 'default'}
                  aria-pressed={field.value === team}
                  onClick={() => field.onChange(team)}
                />
              ))}
            </Stack>
            {fieldState.error && (
              <Typography variant="caption" role="alert" sx={{ color: 'error.main' }}>
                {fieldState.error.message}
              </Typography>
            )}
          </Stack>
        )}
      />
      <RhfTextField
        control={control}
        name="summary"
        label={t('askDuncit.handover.summaryLabel')}
        multiline
        minRows={3}
        slotProps={{ htmlInput: { maxLength: ASK_DUNCIT_HANDOVER_SUMMARY_MAX } }}
      />
      {errors.root?.message && <Alert severity="error">{errors.root.message}</Alert>}
    </Stack>
  );
}
