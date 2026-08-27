import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Card, CardContent, Chip, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { estimateTokens } from '@duncit/ai-prompts';
import {
  aiMonitoringInitialValues,
  buildAiMonitoringSchema,
  type AiMonitoringFormProps,
  type AiMonitoringFormValues,
} from './ai-monitoring.types';



/** The exact JSON the vision call must return. Named here so the warning
 *  sentence can substitute it rather than spell it out in every language. */
const JSON_SHAPE = '{"risk":"LOW|MEDIUM|HIGH","summary":string}';

/**
 * AI Monitoring > Settings.
 *
 * Two things live on one page because they are two halves of one promise: what
 * the platform TELLS a person about their upload, and what it actually ASKS the
 * model to look for. Editing them apart is how a notice ends up describing a
 * check that no longer runs.
 */
export default function AiMonitoringForm({
  initialValues,
  submitting,
  scanModel,
  promptKey,
  onSubmit,
}: Readonly<AiMonitoringFormProps>) {
  const { t } = useTranslation();
  const blankHint = t('ai.settings.blankHint');
  const schema = useMemo(() => buildAiMonitoringSchema(t), [t]);
  const { control, handleSubmit, watch, reset, formState } = useForm<AiMonitoringFormValues>({
    defaultValues: { ...aiMonitoringInitialValues, ...initialValues },
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  // The saved settings arrive after the first render, so the form is built with
  // blanks and refilled here. Without this the page would look empty until a
  // reload, and a save would wipe every field it never showed.
  useEffect(() => {
    if (initialValues) reset({ ...aiMonitoringInitialValues, ...initialValues });
  }, [initialValues, reset]);

  const prompt = watch('image_prompt');
  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form noValidate data-testid="ai-monitoring-form" onSubmit={submit}>
      <Stack spacing={2}>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" sx={{
                fontWeight: 700
              }}>
                {t('ai.settings.noticeTitle')}
              </Typography>
              <Alert severity="info">
                {t('ai.settings.noticeIntro')}
              </Alert>
              <Controller
                control={control}
                name="chip_enabled"
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        name="chip_enabled"
                      />
                    }
                    label={t('ai.settings.chipToggle')}
                  />
                )}
              />
              <RhfTextField
                control={control}
                name="chip_label"
                label={t('ai.settings.chipLabel')}
                hint={blankHint}
              />
              <RhfTextField
                control={control}
                name="dialog_title"
                label={t('ai.settings.dialogTitle')}
                hint={blankHint}
              />
              <RhfTextField
                control={control}
                name="dialog_intro"
                label={t('ai.settings.dialogIntro')}
                multiline
                minRows={2}
                hint={blankHint}
              />
              <RhfTextField
                control={control}
                name="dialog_points"
                label={t('ai.settings.dialogPoints')}
                multiline
                minRows={4}
                hint={t('ai.settings.bulletsHint')}
              />
              <RhfTextField
                control={control}
                name="dialog_footnote"
                label={t('ai.settings.dialogFootnote')}
                multiline
                minRows={2}
                hint={blankHint}
              />
              <RhfTextField
                control={control}
                name="dismiss_label"
                label={t('ai.settings.dismissLabel')}
                hint={blankHint}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" sx={{
                fontWeight: 700
              }}>
                {t('ai.settings.promptTitle')}
              </Typography>
              <Alert severity="warning">
                {t('ai.settings.promptWarning', {
                  vars: {
                    key: promptKey ?? 'upload.image_scan',
                    shape: JSON_SHAPE,
                  },
                })}
              </Alert>
              <RhfTextField
                control={control}
                name="image_prompt"
                label={t('ai.settings.promptLabel')}
                required
                multiline
                minRows={10}
              />
              <Stack direction="row" spacing={1} sx={{
                alignItems: "center"
              }}>
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={t('ai.settings.tokenCount', { vars: { count: estimateTokens(prompt ?? '') } })}
                  data-testid="ai-monitoring-token-count"
                />
                {scanModel && <Chip size="small" variant="outlined" label={scanModel} />}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Stack direction="row" sx={{
          justifyContent: "flex-end"
        }}>
          <DuncitButton type="submit" variant="contained" disabled={submitting || !formState.isValid}>
            {submitting ? t('shell.common.saving') : t('ai.settings.submit')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
