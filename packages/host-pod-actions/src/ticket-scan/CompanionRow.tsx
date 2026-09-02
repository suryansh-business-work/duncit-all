import { Controller, type Control } from 'react-hook-form';
import { Stack, TextField, Typography } from '@mui/material';
import { companionOtpState, type CompanionEntry } from '@duncit/utils';
import CompanionOtpPanel from './CompanionOtpPanel';
import type { CompanionValues } from './companions.form';
import type { CompanionOtpApi } from './useCompanionOtp';
import type { HostPodActionLabels } from '../labels';

interface Props {
  index: number;
  control: Control<CompanionValues>;
  /** This row's live values — what decides whether it can be verified. */
  entry: CompanionEntry;
  labels: HostPodActionLabels;
  otp: CompanionOtpApi;
  /** Editing a proved row drops its proof; the number it named has changed. */
  onEdit: (index: number) => void;
  onVerified: (index: number, challengeId: string) => void;
}

/**
 * One of the other people this ticket admits.
 *
 * Name and number are what the booking owes the door; the WhatsApp code under
 * them is the option to prove that number belongs to the person holding it.
 */
export default function CompanionRow({
  index,
  control,
  entry,
  labels,
  otp,
  onEdit,
  onVerified,
}: Readonly<Props>) {
  const state = companionOtpState(entry, index, otp.activeIndex);

  return (
    <Stack spacing={1}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {labels.companionsHeading(index + 1)}
      </Typography>
      {/* `required` on all three: the ticket cannot check in without them, and
          the asterisk says so before a failed submit rather than after. */}
      <Controller
        control={control}
        name={`companions.${index}.name` as const}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            size="small"
            required
            label={labels.companionName}
            error={!!fieldState.error}
            helperText={fieldState.error?.message ?? labels.fieldRequired}
            onChange={(e) => {
              field.onChange(e);
              onEdit(index);
            }}
          />
        )}
      />
      <Stack direction="row" spacing={1}>
        <Controller
          control={control}
          name={`companions.${index}.phone_extension` as const}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              size="small"
              required
              label={labels.companionExtension}
              sx={{ width: 120 }}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              onChange={(e) => {
                field.onChange(e);
                onEdit(index);
              }}
            />
          )}
        />
        <Controller
          control={control}
          name={`companions.${index}.phone_number` as const}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              size="small"
              required
              fullWidth
              label={labels.companionPhone}
              inputMode="numeric"
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? labels.fieldRequired}
              onChange={(e) => {
                field.onChange(e);
                onEdit(index);
              }}
            />
          )}
        />
      </Stack>

      <CompanionOtpPanel
        index={index}
        entry={entry}
        state={state}
        labels={labels}
        otp={otp}
        onVerified={(challengeId) => onVerified(index, challengeId)}
      />
    </Stack>
  );
}
