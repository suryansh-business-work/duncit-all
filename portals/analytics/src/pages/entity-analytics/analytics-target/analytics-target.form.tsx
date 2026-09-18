import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, DialogActions, DialogContent } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { targetSchema, type TargetValues } from './analytics-target.types';

interface Props {
  defaultValues: TargetValues;
  busy: boolean;
  /** Offered only when the tile already has a goal. */
  onClear?: () => void;
  onCancel: () => void;
  /** Handles its own failure — the dialog reports it and stays open. */
  onSubmit: (values: TargetValues) => Promise<void>;
}

/** A tile's goal: one number, laid out as a dialog's content and actions. */
export default function AnalyticsTargetForm({ defaultValues, busy, onClear, onCancel, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<TargetValues>({
    defaultValues,
    resolver: zodResolver(
      targetSchema({ required: t('analytics.target.required'), invalid: t('analytics.target.invalid') })
    ),
    mode: 'all',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="analytics-target-form">
      <DialogContent dividers>
        <RhfTextField<TargetValues>
          control={control}
          name="goal"
          type="number"
          label={t('analytics.target.goal')}
          hint={t('analytics.target.goalHint')}
          required
          slotProps={{ htmlInput: { 'data-testid': 'analytics-target-goal', min: 0, step: 'any', inputMode: 'decimal' } }}
        />
      </DialogContent>
      <DialogActions>
        {onClear && (
          <DuncitButton color="error" onClick={onClear} disabled={busy} data-testid="analytics-target-clear">
            {t('analytics.target.clear')}
          </DuncitButton>
        )}
        <Box sx={{ flex: 1 }} />
        <DuncitButton onClick={onCancel} disabled={busy}>
          {t('analytics.target.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={busy} data-testid="analytics-target-save">
          {t('analytics.target.save')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
