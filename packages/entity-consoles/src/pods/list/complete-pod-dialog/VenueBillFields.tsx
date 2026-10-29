import { useMemo } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import { RhfTextField, VenueUsageFields } from '@duncit/forms';
import { VENUE_USAGE_LIMITS } from '@duncit/forms/schemas';
import { MediaListField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';
import { shellVenueBillLabels } from '@duncit/utils';
import type { CompletePodValues } from './complete-pod.types';

interface Props {
  control: Control<CompletePodValues, unknown, CompletePodValues>;
  /** The agreed offer was a free venue: owed nothing, so its bill is needed only for extras. */
  freeVenue?: boolean;
}

/**
 * The venue's final bill, in the Admin console's completion dialog — the same
 * answers the host gives in theirs (@duncit/host-pod-actions): the bill's total
 * and the bill itself, both required on a paid venue pod as proof of the agreed
 * amount (a free venue's only when it charged extra), and any extra charges the
 * venue added on top.
 */
export default function VenueBillFields({ control, freeVenue = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = useMemo(() => shellVenueBillLabels(t), [t]);
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">{copy.title}</Typography>
      <RhfTextField
        control={control}
        name="venue_bill_amount"
        type="number"
        required={!freeVenue}
        label={copy.billTotal}
        hint={freeVenue ? t('availability.offers.freeVenueBillHint') : copy.billTotalHint}
        slotProps={{ htmlInput: { min: 0, step: 'any', inputMode: 'decimal' } }}
      />
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
      <RhfTextField
        control={control}
        name="venue_extra_amount"
        type="number"
        label={copy.extra}
        hint={copy.extraHint}
        slotProps={{
          htmlInput: { min: 0, max: VENUE_USAGE_LIMITS.extraMax, step: 'any', inputMode: 'decimal' },
        }}
      />
      <VenueUsageFields
        control={control}
        paxName="venue_pax"
        overtimeName="overtime_hours"
        labels={copy}
        idPrefix="admin-complete"
      />
    </Stack>
  );
}
