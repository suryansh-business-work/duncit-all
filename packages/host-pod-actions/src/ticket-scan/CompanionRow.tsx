import { Controller, type Control } from 'react-hook-form';
import { Stack, TextField, Typography } from '@mui/material';
import { companionOtpState, type CompanionEntry } from '@duncit/utils';
import CompanionOtpPanel from './CompanionOtpPanel';
import type { CompanionValues } from './companions.form';
import type { CompanionOtpApi } from './useCompanionOtp';
import type { HostPodActionLabels } from '../labels';

/**
 * What the number field says under itself.
 *
 * Hoisted so the three-way choice sits at nesting 0 (S3358), and worth
 * saying: a field that stops accepting keystrokes without a word under it
 * reads as broken rather than as settled.
 */
function numberHelper(
  settled: boolean,
  duplicate: boolean,
  labels: HostPodActionLabels,
): string {
  if (settled) return labels.companionLocked;
  if (duplicate) return labels.companionOtpDuplicate;
  return labels.fieldRequired;
}

interface Props {
  index: number;
  control: Control<CompanionValues>;
  /** This row's live values — what decides whether it can be verified. */
  entry: CompanionEntry;
  /** Somebody on this ticket already has this row's number. */
  duplicate: boolean;
  labels: HostPodActionLabels;
  otp: CompanionOtpApi;
  onVerified: (index: number, challengeId: string) => void;
}

/**
 * One of the other people this ticket admits.
 *
 * Name and number are what the booking owes the door; the WhatsApp code under
 * them is the option to prove that number belongs to the person holding it.
 *
 * Once that code is answered the row is SETTLED and reads back as text only.
 * It used to stay editable, and retyping the number silently dropped the tick
 * it had earned — so a host who corrected a digit was left looking at an
 * unverified row with no idea why, and one who did it deliberately would have
 * carried a proof of one number onto another.
 */
export default function CompanionRow({
  index,
  control,
  entry,
  duplicate,
  labels,
  otp,
  onVerified,
}: Readonly<Props>) {
  const state = companionOtpState(entry, index, otp.activeIndex, duplicate);
  const settled = state === 'VERIFIED';
  // Read-only rather than disabled: the host still has to be able to READ the
  // number they proved, and MUI greys a disabled field past legibility.
  const lock = { readOnly: settled };
  // The number is the field both of these are about, so that is where they
  // are said.
  const numberHelp = numberHelper(settled, duplicate, labels);

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
            slotProps={{ input: lock }}
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
              slotProps={{ input: lock }}
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
              error={!!fieldState.error || duplicate}
              helperText={fieldState.error?.message ?? numberHelp}
              slotProps={{ input: lock }}
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
