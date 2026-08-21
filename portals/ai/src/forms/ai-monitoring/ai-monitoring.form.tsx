import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { estimateTokens } from '@duncit/ai-prompts';
import {
  aiMonitoringInitialValues,
  aiMonitoringSchema,
  type AiMonitoringFormProps,
  type AiMonitoringFormValues,
} from './ai-monitoring.types';

export { aiMonitoringSchema };

const BLANK_HINT = 'Leave blank to use the shipped, translated wording.';

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
  const { control, handleSubmit, watch, reset, formState } = useForm<AiMonitoringFormValues>({
    defaultValues: { ...aiMonitoringInitialValues, ...initialValues },
    resolver: zodResolver(aiMonitoringSchema),
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
              <Typography variant="subtitle1" fontWeight={700}>
                What people are told
              </Typography>
              <Alert severity="info">
                These sentences render on the AI Monitoring chip and dialog beside every upload
                field — in the native app, in mWeb and in all portals. A change here reaches all of
                them within a minute.
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
                    label="Show the AI Monitoring chip on upload fields"
                  />
                )}
              />
              <RhfTextField
                control={control}
                name="chip_label"
                label="Chip label"
                hint={BLANK_HINT}
              />
              <RhfTextField
                control={control}
                name="dialog_title"
                label="Dialog title"
                hint={BLANK_HINT}
              />
              <RhfTextField
                control={control}
                name="dialog_intro"
                label="Dialog intro"
                multiline
                minRows={2}
                hint={BLANK_HINT}
              />
              <RhfTextField
                control={control}
                name="dialog_points"
                label="Dialog bullets"
                multiline
                minRows={4}
                hint="One bullet per line. Leave blank to use the shipped, translated list."
              />
              <RhfTextField
                control={control}
                name="dialog_footnote"
                label="Dialog footnote"
                multiline
                minRows={2}
                hint={BLANK_HINT}
              />
              <RhfTextField
                control={control}
                name="dismiss_label"
                label="Dismiss button"
                hint={BLANK_HINT}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" fontWeight={700}>
                Image upload prompt
              </Typography>
              <Alert severity="warning">
                This is the live system prompt every uploaded image is analysed with. It is the same
                row the Prompt Library edits ({promptKey ?? 'upload.image_scan'}) — one prompt, one
                store — and the next upload uses whatever is saved here. It must keep returning
                strict JSON of shape {'{"risk":"LOW|MEDIUM|HIGH","summary":string}'}, or every check
                will record itself as unreadable.
              </Alert>
              <RhfTextField
                control={control}
                name="image_prompt"
                label="Prompt sent with every uploaded image"
                required
                multiline
                minRows={10}
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={`≈ ${estimateTokens(prompt ?? '')} tokens`}
                  data-testid="ai-monitoring-token-count"
                />
                {scanModel && <Chip size="small" variant="outlined" label={scanModel} />}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Stack direction="row" justifyContent="flex-end">
          <Button type="submit" variant="contained" disabled={submitting || !formState.isValid}>
            {submitting ? 'Saving…' : 'Save settings'}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
