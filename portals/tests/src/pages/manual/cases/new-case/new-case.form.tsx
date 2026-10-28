import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Grid } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { RhfOptionSelect } from '../../../../components/manual/RhfOptionSelect';
import { useCaseOptions, useColumnOptions } from '../../shared/useCaseOptions';
import { MANUAL_LIMITS } from '../../shared/vocabulary';
import { BLANK_NEW_CASE, newCaseSchema, type NewCaseValues } from './new-case.types';

/** Submits this form from outside it — the dialog owns the action buttons. */
export const NEW_CASE_FORM_ID = 'manual-new-case-form';

interface Props {
  onSubmit: (values: NewCaseValues) => void;
}

/** File a case: a title and where it sits; the rest is written on its own page. */
export default function NewCaseForm({ onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const options = useCaseOptions();
  const columns = useColumnOptions();
  const schema = useMemo(() => newCaseSchema(t), [t]);
  const { control, handleSubmit } = useForm<NewCaseValues>({
    resolver: zodResolver(schema),
    defaultValues: BLANK_NEW_CASE,
    mode: 'onTouched',
  });

  return (
    <form id={NEW_CASE_FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate>
      <Grid container spacing={2} sx={{ pt: 1 }}>
        <Grid size={12}>
          <RhfTextField
            control={control}
            name="title"
            label={t('testsManual.field.title')}
            hint={t('testsManual.newCase.titleHint')}
            required
            autoFocus
            slotProps={{ htmlInput: { maxLength: MANUAL_LIMITS.titleMax } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RhfOptionSelect control={control} name="type" label={t('testsManual.field.type')} options={options.types} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RhfOptionSelect
            control={control}
            name="priority"
            label={t('testsManual.field.priority')}
            options={options.priorities}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RhfOptionSelect
            control={control}
            name="column_id"
            label={t('testsManual.field.status')}
            options={columns}
            emptyLabel={t('testsManual.newCase.firstColumn')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RhfOptionSelect
            control={control}
            name="assignee_id"
            label={t('testsManual.field.assignee')}
            options={options.people}
            emptyLabel={t('testsManual.card.unassigned')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RhfOptionSelect
            control={control}
            name="surface"
            label={t('testsManual.field.surface')}
            options={options.surfaces}
            emptyLabel={t('testsManual.common.notSet')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RhfOptionSelect
            control={control}
            name="environment"
            label={t('testsManual.field.environment')}
            options={options.environments}
          />
        </Grid>
      </Grid>
    </form>
  );
}
