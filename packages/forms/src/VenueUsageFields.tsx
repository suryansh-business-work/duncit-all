import type { Control, FieldValues, Path } from 'react-hook-form';
import { Stack } from '@mui/material';
import type { VenueBillLabels } from '@duncit/utils';
import { VENUE_USAGE_LIMITS } from './schemas/pod-complete';
import RhfTextField from './RhfTextField';

/** `TOut` is whatever the form's resolver transforms the values into — the fields only read and write `T`. */
export interface VenueUsageFieldsProps<T extends FieldValues, TOut = T> {
  control: Control<T, unknown, TOut>;
  /** Where the form holds the guest count and the overtime hours (both strings as typed). */
  paxName: Path<T>;
  overtimeName: Path<T>;
  labels: Pick<VenueBillLabels, 'pax' | 'paxHint' | 'overtimeHours' | 'overtimeHint'>;
  /** Prefixes the test ids, and keeps two forms on one page apart. */
  idPrefix: string;
}

/**
 * The venue's usage at Complete Pod: the guests it charged for (its slot is
 * priced per guest) and the hours the pod ran past the slot. Both optional —
 * left empty the server counts everyone booked and adds no overtime. The host's
 * dialog (@duncit/host-pod-actions) and the Admin console's show the same two.
 * The rules are `makePodCompleteSchema` / `addVenueUsageIssues`.
 */
export default function VenueUsageFields<T extends FieldValues, TOut = T>({
  control,
  paxName,
  overtimeName,
  labels,
  idPrefix,
}: Readonly<VenueUsageFieldsProps<T, TOut>>) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} data-testid={`${idPrefix}-venue-usage`}>
      <RhfTextField
        control={control}
        name={paxName}
        type="number"
        label={labels.pax}
        hint={labels.paxHint}
        data-testid={`${idPrefix}-venue-pax`}
        slotProps={{ htmlInput: { min: 0, max: VENUE_USAGE_LIMITS.paxMax, step: 1, inputMode: 'numeric' } }}
      />
      <RhfTextField
        control={control}
        name={overtimeName}
        type="number"
        label={labels.overtimeHours}
        hint={labels.overtimeHint}
        data-testid={`${idPrefix}-overtime-hours`}
        slotProps={{ htmlInput: { min: 0, max: VENUE_USAGE_LIMITS.overtimeMax, step: 0.5, inputMode: 'decimal' } }}
      />
    </Stack>
  );
}
