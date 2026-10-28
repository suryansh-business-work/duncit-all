import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import type { ManualTestCaseInput } from '@duncit/gql-types';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { RhfOptionSelect } from '../../../../components/manual/RhfOptionSelect';
import { useCaseOptions, useColumnOptions } from '../../shared/useCaseOptions';
import type { ManualCase } from '../../shared/types';
import { SaveStatus } from '../SaveStatus';
import type { SaveState } from '../useSaveCase';
import { caseDetailsSchema, detailsOf, toDetailsInput, type CaseDetailsValues } from './case-details.types';
import { DueDateField } from './DueDateField';
import { E2eFlowFields } from './E2eFlowFields';
import { LabelsField } from './LabelsField';

interface Props {
  record: ManualCase;
  state: SaveState;
  onSubmit: (input: ManualTestCaseInput) => Promise<void>;
}

/**
 * The case's side panel as one form. It follows the saved case (a save
 * anywhere else on the page shows here at once) while keeping whatever the
 * person is in the middle of changing.
 */
export default function CaseDetailsForm({ record, state, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const options = useCaseOptions();
  const columns = useColumnOptions();
  const schema = useMemo(() => caseDetailsSchema(t), [t]);
  const values = useMemo(() => detailsOf(record), [record]);
  const { control, handleSubmit, formState, setValue, reset } = useForm<CaseDetailsValues>({
    resolver: zodResolver(schema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const saving = state === 'saving';
  const pick = { control, size: 'small' as const, disabled: saving };
  // Read while rendering: react-hook-form tracks dirty fields only for a form that reads them.
  const dirtyKeys = Object.keys(formState.dirtyFields);

  const submit = handleSubmit((next) => onSubmit(toDetailsInput(next, dirtyKeys)));

  return (
    <Stack component="form" spacing={1} noValidate onSubmit={submit}>
      <RhfOptionSelect {...pick} name="column_id" label={t('testsManual.field.status')} options={columns} />
      <RhfOptionSelect
        {...pick}
        name="assignee_id"
        label={t('testsManual.field.assignee')}
        options={options.people}
        emptyLabel={t('testsManual.card.unassigned')}
      />
      <RhfOptionSelect
        {...pick}
        name="reporter_id"
        label={t('testsManual.field.reporter')}
        options={options.people}
        emptyLabel={t('testsManual.common.notSet')}
      />
      <RhfOptionSelect {...pick} name="type" label={t('testsManual.field.type')} options={options.types} />
      <RhfOptionSelect {...pick} name="priority" label={t('testsManual.field.priority')} options={options.priorities} />
      <LabelsField control={control} disabled={saving} />
      <RhfOptionSelect
        {...pick}
        name="surface"
        label={t('testsManual.field.surface')}
        options={options.surfaces}
        emptyLabel={t('testsManual.common.notSet')}
      />
      <RhfOptionSelect
        {...pick}
        name="environment"
        label={t('testsManual.field.environment')}
        options={options.environments}
      />
      <DueDateField control={control} disabled={saving} />
      <RhfTextField
        {...pick}
        name="estimate_minutes"
        label={t('testsManual.field.estimate')}
        hint={t('testsManual.details.estimateHint')}
        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
      />
      <E2eFlowFields
        control={control}
        setValue={setValue}
        linked={record.e2e_flow ?? null}
        linkedSub={record.e2e_sub_flow ?? null}
        disabled={saving}
      />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'flex-end', pt: 1 }}>
        <SaveStatus state={state} dirty={formState.isDirty} />
        <DuncitButton onClick={() => reset(values)} disabled={saving || !formState.isDirty}>
          {t('testsManual.details.discard')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={saving} disabled={!formState.isDirty}>
          {t('shell.common.save')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
