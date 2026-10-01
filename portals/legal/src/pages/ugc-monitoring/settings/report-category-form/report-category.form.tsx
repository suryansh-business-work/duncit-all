import { useEffect, useMemo } from 'react';
import { Controller, useForm, type Control, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormControl, FormControlLabel, FormHelperText, Stack, Switch } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import {
  makeReportCategorySchema,
  type ReportCategoryFormValues,
} from './report-category.types';

interface Props {
  /** The dialog's Save button submits this form by id from its actions bar. */
  formId: string;
  initialValues: ReportCategoryFormValues;
  disabled: boolean;
  onSubmit: (values: ReportCategoryFormValues) => Promise<void>;
}

type CategoryResolver = Resolver<ReportCategoryFormValues, unknown, ReportCategoryFormValues>;

interface SwitchFieldProps {
  control: Control<ReportCategoryFormValues>;
  name: 'requires_details' | 'is_active';
  label: string;
  hint: string;
  disabled: boolean;
}

/** A switch with the sentence that says what flipping it does, read out with it. */
function SwitchField({ control, name, label, hint, disabled }: Readonly<SwitchFieldProps>) {
  const hintId = `report-category-${name}-hint`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur } }) => (
        <FormControl component="fieldset" variant="standard" disabled={disabled}>
          <FormControlLabel
            label={label}
            control={
              <Switch
                checked={value}
                onChange={(_event, checked) => onChange(checked)}
                onBlur={onBlur}
                slotProps={{
                  input: {
                    'aria-describedby': hintId,
                    'data-testid': `report-category-${name}`,
                  } as Record<string, string>,
                }}
              />
            }
          />
          <FormHelperText id={hintId} sx={{ mt: 0 }}>
            {hint}
          </FormHelperText>
        </FormControl>
      )}
    />
  );
}

/**
 * One report category: its name, the line under it, whether the reporter must
 * explain themselves, where it sits in the list and whether it is shown.
 *
 * There is no field for the category's key. It is minted from the name on
 * create and never changes, because reports already filed point at it — a
 * rename here is a new label on the same category, not a new category.
 */
export default function ReportCategoryForm({
  formId,
  initialValues,
  disabled,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeReportCategorySchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<ReportCategoryFormValues, unknown, ReportCategoryFormValues>({
    resolver: zodResolver(schema) as unknown as CategoryResolver,
    defaultValues: initialValues,
    mode: 'onTouched',
  });

  // The dialog stays mounted between opens, so the form is re-seeded whenever
  // it is pointed at a different category.
  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  return (
    <form id={formId} data-testid="report-category-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={1}>
        <RhfTextField
          control={control}
          name="label"
          label={t('reportLogs.categoryName')}
          placeholder={t('reportLogs.categoryNamePlaceholder')}
          hint={t('reportLogs.categoryNameHint')}
          required
          disabled={disabled}
          slotProps={{ htmlInput: { 'data-testid': 'report-category-label' } }}
        />
        <RhfTextField
          control={control}
          name="description"
          label={t('reportLogs.categoryDescription')}
          placeholder={t('reportLogs.categoryDescriptionPlaceholder')}
          hint={t('reportLogs.categoryDescriptionHint')}
          multiline
          minRows={2}
          disabled={disabled}
          slotProps={{ htmlInput: { 'data-testid': 'report-category-description' } }}
        />
        <RhfTextField
          control={control}
          name="sort_order"
          label={t('reportLogs.categoryOrder')}
          hint={t('reportLogs.categoryOrderHint')}
          disabled={disabled}
          slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'report-category-order' } }}
        />
        <SwitchField
          control={control}
          name="requires_details"
          label={t('reportLogs.categoryRequiresDetails')}
          hint={t('reportLogs.categoryRequiresDetailsHint')}
          disabled={disabled}
        />
        <SwitchField
          control={control}
          name="is_active"
          label={t('reportLogs.categoryActive')}
          hint={t('reportLogs.categoryActiveHint')}
          disabled={disabled}
        />
      </Stack>
    </form>
  );
}
