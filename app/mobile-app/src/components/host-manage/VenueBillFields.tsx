import { Controller, type Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import type { VenueBillLabels } from '@duncit/utils';

import { MediaUploadField } from '@/components/create-pod/MediaUploadField/MediaUploadField';
import { FormTextField } from '@/components/FormTextField';
import type { PodCompleteValues } from './pod-complete.form';

interface Props {
  control: Control<PodCompleteValues>;
  labels: VenueBillLabels;
  /** Off for a free venue: its bill is owed only once extra charges or a total are entered. */
  billRequired?: boolean;
}

/**
 * The venue's final bill, in the host's completion dialog — rendered only for a
 * paid pod at a venue.
 *
 * The venue is paid the amount agreed with it, and its final bill is the PROOF
 * of that amount: the bill's total and the bill itself are both required.
 * Anything the venue charged beyond the agreed amount goes in as extra charges,
 * paid on top (with Duncit's fee) once Finance approves them against the bill.
 * A free venue is agreed no amount, so its bill is not marked required.
 * mWeb twin: @duncit/host-pod-actions VenueBillFields.
 */
export function VenueBillFields({ control, labels, billRequired = true }: Readonly<Props>) {
  return (
    <YStack gap={12} testID="pod-complete-venue-bill-fields">
      <Text fontSize={14} fontWeight="600" color="$color">
        {labels.title}
      </Text>
      <FormTextField
        control={control}
        name="venue_bill_amount"
        label={labels.billTotal}
        hint={labels.billTotalHint}
        keyboardType="decimal-pad"
        required={billRequired}
      />
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
            required={billRequired}
          />
        )}
      />
      <FormTextField
        control={control}
        name="venue_extra_amount"
        label={labels.extra}
        hint={labels.extraHint}
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
    </YStack>
  );
}
