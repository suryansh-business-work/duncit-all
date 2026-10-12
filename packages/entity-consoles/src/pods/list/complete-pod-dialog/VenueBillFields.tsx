import { useMemo } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { Checkbox, FormControlLabel, FormHelperText, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { MediaListField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';
import { shellVenueBillLabels } from '@duncit/utils';
import type { CompletePodValues } from './complete-pod.types';

interface Props {
  control: Control<CompletePodValues, unknown, CompletePodValues>;
  /** The amount as typed — the bill itself and the slot-price choice only
   * matter once there is one. */
  billAmount: number;
}

/**
 * The venue's final bill, in the Admin console's completion dialog — the same
 * three answers the host gives in theirs (@duncit/host-pod-actions): an
 * optional amount, the bill behind it, and whether it comes on top of the
 * booked slot price or replaces it.
 */
export default function VenueBillFields({ control, billAmount }: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = useMemo(() => shellVenueBillLabels(t), [t]);
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">{copy.title}</Typography>
      <RhfTextField
        control={control}
        name="venue_bill_amount"
        type="number"
        label={copy.amount}
        hint={copy.amountHint}
      />
      {billAmount > 0 && (
        <>
          <Controller
            control={control}
            name="venue_bill_media"
            render={({ field, fieldState }) => (
              <MediaListField
                label={copy.upload}
                value={field.value}
                onChange={field.onChange}
                folder="/pod-completion"
                deviceOnly
                helperText={fieldState.error?.message ?? ' '}
              />
            )}
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
                        input: { 'aria-describedby': 'complete-pod-include-slot-hint' },
                      }}
                    />
                  }
                />
                <FormHelperText id="complete-pod-include-slot-hint" sx={{ mt: 0 }}>
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
