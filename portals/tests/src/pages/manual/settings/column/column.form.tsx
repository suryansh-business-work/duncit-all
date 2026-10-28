import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { RhfOptionSelect } from '../../../../components/manual/RhfOptionSelect';
import { CATEGORIES, CATEGORY_KEYS, MANUAL_LIMITS } from '../../shared/vocabulary';
import { BLANK_COLUMN, columnSchema, type ColumnValues } from './column.types';

/** Submits this form from outside it — the dialog owns the action buttons. */
export const COLUMN_FORM_ID = 'manual-column-form';

interface Props {
  initial?: ColumnValues;
  onSubmit: (values: ColumnValues) => Promise<void>;
}

/** Add or change a board column. */
export default function ColumnForm({ initial, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const categories = useMemo(() => CATEGORIES.map((value) => ({ value, label: t(CATEGORY_KEYS[value]) })), [t]);
  const schema = useMemo(() => columnSchema(t), [t]);
  const { control, handleSubmit } = useForm<ColumnValues>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? BLANK_COLUMN,
    mode: 'onTouched',
  });

  return (
    <Stack component="form" id={COLUMN_FORM_ID} spacing={1} noValidate onSubmit={handleSubmit(onSubmit)} sx={{ pt: 1 }}>
      <RhfTextField
        control={control}
        name="name"
        label={t('testsManual.settings.name')}
        required
        // eslint-disable-next-line jsx-a11y/no-autofocus -- focus moves into the dialog the user just opened (WCAG 2.4.3)
        autoFocus
        slotProps={{ htmlInput: { maxLength: MANUAL_LIMITS.columnNameMax } }}
      />
      <RhfOptionSelect
        control={control}
        name="category"
        label={t('testsManual.settings.category')}
        hint={t('testsManual.settings.categoryHint')}
        options={categories}
      />
      <RhfTextField
        control={control}
        name="wip_limit"
        label={t('testsManual.settings.wipLimit')}
        hint={t('testsManual.settings.wipLimitHint')}
        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
      />
    </Stack>
  );
}
