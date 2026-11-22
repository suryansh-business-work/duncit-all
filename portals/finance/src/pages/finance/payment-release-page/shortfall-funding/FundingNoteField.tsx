import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { SHORTFALL_NOTE_MAX, SHORTFALL_NOTE_MIN } from './shortfall-funding.schema';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
}

/**
 * "Who funds the shortfall" — the one field both approval paths ask it with:
 * "Approve all payouts" and the single-payout review. The input stops at the
 * longest note a release stores, so the only refusal a person can meet here is
 * a note that is too short.
 */
export default function FundingNoteField<T extends FieldValues>({ control, name }: Readonly<Props<T>>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          label={t('finance.paymentRelease.fundingNote')}
          required
          error={!!fieldState.error}
          helperText={
            fieldState.error?.message ??
            t('finance.paymentRelease.fundingNoteHint', { vars: { min: SHORTFALL_NOTE_MIN } })
          }
          slotProps={{ htmlInput: { maxLength: SHORTFALL_NOTE_MAX } }}
          multiline
          minRows={3}
          fullWidth
        />
      )}
    />
  );
}
