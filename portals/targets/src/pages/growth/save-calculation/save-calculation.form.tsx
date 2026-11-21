import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Stack, TextField } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { GROWTH_DESCRIPTION_MAX, GROWTH_TITLE_MAX } from '../../../lib/growth-calculator';
import { EMPTY_SAVE_VALUES, saveCalculationSchema } from './save-calculation.schema';
import type { SaveCalculationFormProps, SaveCalculationFormValues } from './save-calculation.types';

/**
 * Title, description and who the calculation is by. "Calculated by" and
 * "Created at" are shown, never typed: the server takes both from the signed-in
 * session and the clock. Editing keeps the original creator and date.
 */
export default function SaveCalculationForm({
  editing,
  canSave,
  calculatedBy,
  onSubmit,
  onCancelEdit,
}: Readonly<SaveCalculationFormProps>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const schema = useMemo(() => saveCalculationSchema(t), [t]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<SaveCalculationFormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_SAVE_VALUES });

  useEffect(() => {
    reset(editing ? { title: editing.title, description: editing.description } : EMPTY_SAVE_VALUES);
  }, [editing, reset]);

  const submit = async (values: SaveCalculationFormValues) => {
    if (await onSubmit(values)) reset(EMPTY_SAVE_VALUES);
  };

  const creator = editing ? editing.calculated_by.name : calculatedBy;
  const createdAt = editing ? formatDateTime(editing.created_at) : t('targets.growth.save.createdAtPending');
  const submitLabel = editing ? t('targets.growth.save.update') : t('targets.growth.save.submit');

  return (
    <Stack spacing={2} component="form" noValidate onSubmit={handleSubmit(submit)} data-testid="save-calculation-form">
      {editing && <Alert severity="info">{t('targets.growth.save.editing', { vars: { title: editing.title } })}</Alert>}
      {!canSave && <Alert severity="warning">{t('targets.growth.save.fixInputs')}</Alert>}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <RhfTextField
          control={control}
          name="title"
          label={t('targets.growth.save.titleLabel')}
          required
          slotProps={{ htmlInput: { maxLength: GROWTH_TITLE_MAX, 'data-testid': 'save-calculation-title' } }}
        />
        <RhfTextField
          control={control}
          name="description"
          label={t('targets.growth.save.descriptionLabel')}
          hint={t('targets.growth.save.descriptionHint')}
          multiline
          minRows={1}
          maxRows={4}
          slotProps={{ htmlInput: { maxLength: GROWTH_DESCRIPTION_MAX, 'data-testid': 'save-calculation-description' } }}
        />
        <TextField
          label={t('targets.growth.save.calculatedBy')}
          value={creator}
          fullWidth
          slotProps={{ input: { readOnly: true }, htmlInput: { 'data-testid': 'save-calculation-by' } }}
        />
        <TextField
          label={t('targets.growth.save.createdAt')}
          value={createdAt}
          fullWidth
          slotProps={{ input: { readOnly: true }, htmlInput: { 'data-testid': 'save-calculation-at' } }}
        />
      </Box>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        {editing && (
          <DuncitButton onClick={onCancelEdit} disabled={isSubmitting} data-testid="save-calculation-cancel">
            {t('targets.growth.save.cancelEdit')}
          </DuncitButton>
        )}
        <DuncitButton
          type="submit"
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={isSubmitting || !canSave}
          data-testid="save-calculation-submit"
        >
          {submitLabel}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
