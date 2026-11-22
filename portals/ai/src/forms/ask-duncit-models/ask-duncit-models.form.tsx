import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { buildAskDuncitModelsSchema, type AskDuncitModelsFormProps, type AskDuncitModelsValues } from './ask-duncit-models.types';

type ModelsResolver = Resolver<AskDuncitModelsValues, unknown, AskDuncitModelsValues>;

type Translate = ReturnType<typeof useTranslation>['t'];

const TEXT_FIELDS = ['default_model', 'evaluator_model', 'transcription_model', 'speech_model', 'speech_voice'] as const;
const NUMBER_FIELDS = ['temperature', 'max_output_tokens', 'max_tool_rounds', 'history_turns', 'low_confidence_threshold'] as const;

/** Every key written out once, so the translation gate can see it. */
const copy = (t: Translate): Record<(typeof TEXT_FIELDS)[number] | (typeof NUMBER_FIELDS)[number], { label: string; hint: string }> => ({
  default_model: { label: t('ai.askDuncit.models.defaultModel'), hint: t('ai.askDuncit.models.defaultModelHint') },
  evaluator_model: { label: t('ai.askDuncit.models.evaluatorModel'), hint: t('ai.askDuncit.models.evaluatorModelHint') },
  transcription_model: { label: t('ai.askDuncit.models.transcriptionModel'), hint: t('ai.askDuncit.models.transcriptionModelHint') },
  speech_model: { label: t('ai.askDuncit.models.speechModel'), hint: t('ai.askDuncit.models.speechModelHint') },
  speech_voice: { label: t('ai.askDuncit.models.speechVoice'), hint: t('ai.askDuncit.models.speechVoiceHint') },
  temperature: { label: t('ai.askDuncit.models.temperature'), hint: t('ai.askDuncit.models.temperatureHint') },
  max_output_tokens: { label: t('ai.askDuncit.models.maxOutputTokens'), hint: t('ai.askDuncit.models.maxOutputTokensHint') },
  max_tool_rounds: { label: t('ai.askDuncit.models.maxToolRounds'), hint: t('ai.askDuncit.models.maxToolRoundsHint') },
  history_turns: { label: t('ai.askDuncit.models.historyTurns'), hint: t('ai.askDuncit.models.historyTurnsHint') },
  low_confidence_threshold: { label: t('ai.askDuncit.models.lowConfidence'), hint: t('ai.askDuncit.models.lowConfidenceHint') },
});

/** Ask Duncit › Model & LLM Settings (RHF + Zod). Role-wise models live in the Control Center. */
export default function AskDuncitModelsForm({ initialValues, submitting, onSubmit }: Readonly<AskDuncitModelsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildAskDuncitModelsSchema(t), [t]);
  const labels = useMemo(() => copy(t), [t]);
  const { control, handleSubmit, reset, formState } = useForm<AskDuncitModelsValues, unknown, AskDuncitModelsValues>({
    defaultValues: initialValues,
    resolver: zodResolver(schema) as unknown as ModelsResolver,
    mode: 'onChange',
  });
  useEffect(() => reset(initialValues), [initialValues, reset]);

  return (
    <Card component="form" noValidate onSubmit={handleSubmit(onSubmit)} data-testid="ask-duncit-models-form">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('ai.askDuncit.models.section')}
          </Typography>
          <Grid container spacing={2}>
            {TEXT_FIELDS.map((name) => (
              <Grid key={name} size={{ xs: 12, sm: 6 }}>
                <RhfTextField control={control} name={name} label={labels[name].label} hint={labels[name].hint} fullWidth />
              </Grid>
            ))}
            {NUMBER_FIELDS.map((name) => (
              <Grid key={name} size={{ xs: 12, sm: 6, md: 4 }}>
                <RhfTextField control={control} name={name} type="number" label={labels[name].label} hint={labels[name].hint} fullWidth />
              </Grid>
            ))}
          </Grid>
          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <DuncitButton type="submit" variant="contained" disabled={submitting || !formState.isDirty || !formState.isValid}>
              {t('ai.askDuncit.save')}
            </DuncitButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
