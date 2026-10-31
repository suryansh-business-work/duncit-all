import { useEffect, useMemo } from 'react';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, DialogActions, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import SequenceSettingsFields from './SequenceSettingsFields';
import StepList from './StepList';
import { blankSequenceValues, sequenceSchema, sequenceValuesFrom, type SequenceFormProps, type SequenceFormValues } from './sequence.types';

export {
  blankSequenceValues,
  blankStep,
  paramList,
  sequenceSchema,
  sequenceValuesFrom,
  toSequenceInput,
  toStepInput,
} from './sequence.types';

/** A sequence: what it is, who it takes, how fast it goes, and its steps in order. */
export default function SequenceForm({ sequence, templates, busy, readOnly, onSubmit, onCancel }: Readonly<SequenceFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => sequenceSchema(t, templates), [t, templates]);
  const methods = useForm<SequenceFormValues, unknown, SequenceFormValues>({
    defaultValues: sequence ? sequenceValuesFrom(sequence) : blankSequenceValues(),
    resolver: zodResolver(schema) as unknown as Resolver<SequenceFormValues, unknown, SequenceFormValues>,
    mode: 'onChange',
  });
  const { handleSubmit, reset, formState } = methods;

  // What the server last answered is the baseline, not a pending edit.
  useEffect(() => {
    reset(sequence ? sequenceValuesFrom(sequence) : blankSequenceValues());
  }, [sequence, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });
  // A rule about the whole list (none that reaches the lead, ends on a wait) lands on the array's root.
  const stepsError = formState.errors.steps?.root?.message;

  return (
    <FormProvider {...methods}>
      <form noValidate onSubmit={submit} aria-label={t('marketing.outreach.formLabel')} data-testid="sequence-form">
        <Stack spacing={2} sx={{ pt: 1 }}>
          <SequenceSettingsFields disabled={readOnly || busy} />
          <StepList
            disabled={readOnly || busy}
            templates={templates}
            sequenceId={sequence?.id ?? null}
            savedKinds={sequence?.steps.map((step) => step.kind) ?? []}
          />
          {stepsError && (
            <Alert severity="error" data-testid="sequence-steps-error">
              {stepsError}
            </Alert>
          )}
        </Stack>
        <DialogActions sx={{ px: 0, pb: 0 }}>
          <DuncitButton onClick={onCancel} disabled={busy}>
            {t('shell.common.cancel')}
          </DuncitButton>
          {!readOnly && (
            <DuncitButton type="submit" variant="contained" loading={busy} data-testid="sequence-submit">
              {t('marketing.outreach.save')}
            </DuncitButton>
          )}
        </DialogActions>
      </form>
    </FormProvider>
  );
}
