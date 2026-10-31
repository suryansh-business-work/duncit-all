import { useFieldArray, useFormContext } from 'react-hook-form';
import { Alert, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { OUTREACH_LIMITS, OUTREACH_VARIABLES, STEP_KINDS, STEP_KIND_LABEL } from '../copy';
import type { OutreachStepKind, OutreachWaTemplate } from '../queries';
import StepCard from './StepCard';
import { blankStep, type SequenceFormValues } from './sequence.types';

interface Props {
  disabled: boolean;
  templates: readonly OutreachWaTemplate[];
  /** The saved sequence's id; null until it is saved, and AI drafting waits for it. */
  sequenceId: string | null;
  /** The kinds of the steps as saved — a draft is only asked for a step the server already has. */
  savedKinds: readonly OutreachStepKind[];
}

/** The steps, in the order a lead walks them: add one of each kind, move it up or down, take it out. */
export default function StepList({ disabled, templates, sequenceId, savedKinds }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = useFormContext<SequenceFormValues>();
  const { fields, append, move, remove } = useFieldArray({ control, name: 'steps' });
  const full = fields.length >= OUTREACH_LIMITS.steps.max;

  return (
    <Stack spacing={1.5} data-testid="sequence-steps">
      <Typography variant="subtitle1" component="h3">
        {t('marketing.outreach.stepsTitle')}
      </Typography>
      <Alert severity="info" data-testid="sequence-variables">
        {t('marketing.outreach.variablesHelp', { vars: { variables: OUTREACH_VARIABLES.join(', ') } })}
      </Alert>
      {fields.map((field, index) => (
        <StepCard
          key={field.id}
          index={index}
          count={fields.length}
          disabled={disabled}
          templates={templates}
          sequenceId={sequenceId}
          savedKind={savedKinds[index] ?? null}
          onMove={move}
          onRemove={remove}
        />
      ))}
      {!disabled && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {STEP_KINDS.map((kind) => (
            <DuncitButton
              key={kind}
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              disabled={full}
              onClick={() => append(blankStep(kind))}
              data-testid={`add-step-${kind}`}
            >
              {t('marketing.outreach.addStep', { vars: { kind: t(STEP_KIND_LABEL[kind]) } })}
            </DuncitButton>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
