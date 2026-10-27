import { useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormHelperText, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { MANUAL_LIMITS } from '../../shared/vocabulary';
import { SaveStatus } from '../SaveStatus';
import type { SaveState } from '../useSaveCase';
import { BLANK_STEP, caseStepsSchema, type CaseStepsValues } from './case-steps.types';
import { StepRow } from './StepRow';

interface Props {
  initial: CaseStepsValues['steps'];
  state: SaveState;
  onSubmit: (steps: CaseStepsValues['steps']) => Promise<void>;
  onCancel: () => void;
}

/** Add, reorder and remove a case's steps; Save writes the whole ordered list. */
export default function CaseStepsForm({ initial, state, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => caseStepsSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<CaseStepsValues>({
    resolver: zodResolver(schema),
    defaultValues: { steps: initial.length > 0 ? initial : [BLANK_STEP] },
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: 'steps' });
  const saving = state === 'saving';
  const listError = formState.errors.steps?.message;

  return (
    <Stack component="form" spacing={2} noValidate onSubmit={handleSubmit((values) => onSubmit(values.steps))}>
      <Stack component="ol" spacing={2} sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {fields.map((field, index) => (
          <StepRow
            key={field.id}
            control={control}
            index={index}
            count={fields.length}
            disabled={saving}
            onMove={move}
            onRemove={remove}
          />
        ))}
      </Stack>
      {listError ? <FormHelperText error>{listError}</FormHelperText> : null}
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <DuncitButton
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => append({ ...BLANK_STEP })}
          disabled={saving || fields.length >= MANUAL_LIMITS.stepsMax}
        >
          {t('testsManual.steps.add')}
        </DuncitButton>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', ml: 'auto' }}>
          <SaveStatus state={state} dirty={formState.isDirty} />
          <DuncitButton onClick={onCancel} disabled={saving}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={saving} disabled={!formState.isDirty}>
            {t('shell.common.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </Stack>
  );
}
