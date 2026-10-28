import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { RhfOptionSelect } from '../../../../components/manual/RhfOptionSelect';
import type { ManualColumn } from '../../shared/types';
import { deleteColumnSchema, type DeleteColumnValues } from './delete-column.types';

/** Submits this form from outside it — the dialog owns the action buttons. */
export const DELETE_COLUMN_FORM_ID = 'manual-delete-column-form';

interface Props {
  column: ManualColumn;
  /** Every other column — where the cases may go. */
  targets: readonly ManualColumn[];
  onSubmit: (values: DeleteColumnValues) => Promise<void>;
}

/** Pick the column that takes over a deleted column's cases. */
export default function DeleteColumnForm({ column, targets, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => deleteColumnSchema(t), [t]);
  const options = useMemo(() => targets.map((target) => ({ value: target.id, label: target.name })), [targets]);
  const { control, handleSubmit } = useForm<DeleteColumnValues>({
    resolver: zodResolver(schema),
    defaultValues: { target_column_id: targets[0]?.id ?? '' },
  });

  return (
    <Stack component="form" id={DELETE_COLUMN_FORM_ID} spacing={2} noValidate onSubmit={handleSubmit(onSubmit)}>
      <Typography variant="body2">
        {t('testsManual.settings.deleteExplain', { vars: { name: column.name, count: column.case_count ?? 0 } })}
      </Typography>
      <RhfOptionSelect
        control={control}
        name="target_column_id"
        label={t('testsManual.settings.moveCasesTo')}
        options={options}
        required
      />
    </Stack>
  );
}
