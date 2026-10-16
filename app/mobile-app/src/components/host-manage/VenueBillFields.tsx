import { Controller, type Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import type { VenueBillLabels } from '@duncit/utils';

import { MediaUploadField } from '@/components/create-pod/MediaUploadField/MediaUploadField';
import { FormTextField } from '@/components/FormTextField';
import { ToggleRow } from '@/components/ToggleRow';
import type { PodCompleteValues } from './pod-complete.form';

interface Props {
  control: Control<PodCompleteValues>;
  labels: VenueBillLabels;
  /** The amount as typed — the bill itself and the slot-price choice only
   * matter once there is one. */
  billAmount: number;
}

/**
 * The venue's final bill, in the host's completion dialog. Optional: left
 * empty, the venue is paid the slot price it was booked at. With an amount the
 * bill is uploaded with it, and the host says whether it comes on top of the
 * slot price or replaces it. mWeb twin: @duncit/host-pod-actions VenueBillFields.
 */
export function VenueBillFields({ control, labels, billAmount }: Readonly<Props>) {
  return (
    <YStack gap={12} testID="pod-complete-venue-bill-fields">
      <Text fontSize={14} fontWeight="600" color="$color">
        {labels.title}
      </Text>
      <FormTextField
        control={control}
        name="venue_bill_amount"
        label={labels.amount}
        hint={labels.amountHint}
        keyboardType="decimal-pad"
      />
      <FormTextField
        control={control}
        name="venue_pax"
        label={labels.pax}
        hint={labels.paxHint}
        keyboardType="number-pad"
      />
      <FormTextField
        control={control}
        name="overtime_hours"
        label={labels.overtimeHours}
        hint={labels.overtimeHint}
        keyboardType="decimal-pad"
      />
      {billAmount > 0 ? (
        <>
          <Controller
            control={control}
            name="venue_bill_media"
            render={({ field, fieldState }) => (
              <MediaUploadField
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                label={labels.upload}
                pickerTitle={labels.upload}
                folder="/pod-completion"
                maxImages={1}
                deviceOnly
                required
              />
            )}
          />
          <Controller
            control={control}
            name="include_slot_price"
            render={({ field }) => (
              <ToggleRow
                testID="pod-complete-include-slot"
                label={labels.includeSlot}
                hint={labels.includeSlotHint}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </>
      ) : null}
    </YStack>
  );
}
