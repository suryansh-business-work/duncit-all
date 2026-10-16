import { Controller, type Control } from 'react-hook-form';
import {
  Checkbox,
  FormControlLabel,
  FormHelperText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { VenueUsageFields } from '@duncit/forms';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { PodCompleteValues } from './pod-complete.form';

interface Props {
  control: Control<PodCompleteValues, unknown, PodCompleteValues>;
  /** The amount as typed — the bill itself and the slot-price choice only
   * matter once there is one. */
  billAmount: number;
}

/**
 * The venue's final bill, in the host's completion dialog.
 *
 * Optional: left empty, the venue is paid the slot price it was booked at.
 * With an amount, the bill has to be uploaded with it — Finance approves the
 * payout against that document — and the host says whether the bill is the
 * whole charge or comes on top of the slot price.
 */
export default function VenueBillFields({ control, billAmount }: Readonly<Props>) {
  const { labels, renderMediaField } = useHostPodActionsConfig();
  const copy = labels.venueBill;
  return (
    <Stack spacing={1.5} data-testid="pod-complete-venue-bill-fields">
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {copy.title}
      </Typography>
      <Controller
        control={control}
        name="venue_bill_amount"
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label={copy.amount}
            type="number"
            fullWidth
            data-testid="pod-complete-venue-bill"
            error={!!fieldState.error}
            helperText={fieldState.error?.message ?? copy.amountHint}
            slotProps={{ htmlInput: { min: 0, step: 'any', inputMode: 'decimal' } }}
          />
        )}
      />
      <VenueUsageFields control={control} paxName="venue_pax" overtimeName="overtime_hours" labels={copy} idPrefix="pod-complete" />
      {billAmount > 0 && (
        <>
          <Controller
            control={control}
            name="venue_bill_media"
            render={({ field, fieldState }) =>
              renderMediaField({
                value: field.value,
                onChange: field.onChange,
                error: fieldState.error?.message,
                label: copy.upload,
                folder: '/pod-completion',
                deviceOnly: true,
              })
            }
          />
          <Controller
            control={control}
            name="include_slot_price"
            render={({ field }) => (
              <Stack>
                <FormControlLabel
                  label={copy.includeSlot}
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      onBlur={field.onBlur}
                      slotProps={{
                        input: { 'aria-describedby': 'pod-complete-include-slot-hint' },
                      }}
                      data-testid="pod-complete-include-slot"
                    />
                  }
                />
                <FormHelperText id="pod-complete-include-slot-hint" sx={{ mt: 0 }}>
                  {copy.includeSlotHint}
                </FormHelperText>
              </Stack>
            )}
          />
        </>
      )}
    </Stack>
  );
}
