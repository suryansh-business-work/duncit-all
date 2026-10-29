import { Controller, type Control } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import { RhfTextField, VenueUsageFields } from '@duncit/forms';
import { VENUE_USAGE_LIMITS } from '@duncit/forms/schemas';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { PodCompleteValues } from './pod-complete.form';

interface Props {
  control: Control<PodCompleteValues, unknown, PodCompleteValues>;
  /** The venue gave the booking free: its bill is owed only with extra charges, so the total is not marked required. */
  billOptional?: boolean;
}

/**
 * The venue's final bill, in the host's completion dialog — rendered only for a
 * paid pod at a venue.
 *
 * The venue is paid the amount agreed with it, and its final bill is the PROOF
 * of that amount: the bill's total and the bill itself are both required.
 * Anything the venue charged beyond the agreed amount goes in as extra charges,
 * paid on top (with Duncit's fee) once Finance approves them against the bill.
 * A venue that gave the booking free is owed nothing for it, so its bill is
 * needed only for extras (`billOptional`).
 */
export default function VenueBillFields({ control, billOptional = false }: Readonly<Props>) {
  const { labels, renderMediaField } = useHostPodActionsConfig();
  const copy = labels.venueBill;
  return (
    <Stack spacing={1.5} data-testid="pod-complete-venue-bill-fields">
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {copy.title}
      </Typography>
      <RhfTextField
        control={control}
        name="venue_bill_amount"
        type="number"
        required={!billOptional}
        label={copy.billTotal}
        hint={copy.billTotalHint}
        data-testid="pod-complete-venue-bill"
        slotProps={{ htmlInput: { min: 0, step: 'any', inputMode: 'decimal' } }}
      />
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
      <RhfTextField
        control={control}
        name="venue_extra_amount"
        type="number"
        label={copy.extra}
        hint={copy.extraHint}
        data-testid="pod-complete-venue-extra"
        slotProps={{
          htmlInput: { min: 0, max: VENUE_USAGE_LIMITS.extraMax, step: 'any', inputMode: 'decimal' },
        }}
      />
      <VenueUsageFields
        control={control}
        paxName="venue_pax"
        overtimeName="overtime_hours"
        labels={copy}
        idPrefix="pod-complete"
      />
    </Stack>
  );
}
