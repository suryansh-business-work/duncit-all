import { Box } from '@mui/material';
import { PickersDay, type PickersDayProps } from '@mui/x-date-pickers';

/**
 * A calendar day that shows whether it holds slots. Module scope, not nested in
 * the calendar (rule 26a S6478) — MUIX re-creates day cells constantly, and a
 * component redefined per render would remount every one of them.
 */
export interface SlotDayCellProps extends PickersDayProps<Date> {
  /** Injected via `slots.day` + `slotProps.day`; MUIX passes it straight through. */
  hasSlots?: (day: Date) => boolean;
}

export default function SlotDayCell({ hasSlots, ...dayProps }: Readonly<SlotDayCellProps>) {
  const marked = !dayProps.outsideCurrentMonth && hasSlots?.(dayProps.day) === true;
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <PickersDay {...dayProps} />
      {marked && !dayProps.selected && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            bottom: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 4,
            height: 4,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            pointerEvents: 'none',
          }}
        />
      )}
    </Box>
  );
}
