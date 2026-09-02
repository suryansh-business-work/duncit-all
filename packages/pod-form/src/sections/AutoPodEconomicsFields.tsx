import { MenuItem, Stack, TextField } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import { useSpotsBounds, useSpotsFloor } from '../useSpotsBounds';
import { OCCURRENCES, type PodFormValues } from '../types';
import { useTranslation } from '../i18n/useTranslation';

/**
 * The price, the spots and the occurrence of an Auto Pod, inside Basic
 * Information. The template has no Payment & Charges section — no venue means
 * no place charges, and the earnings projection needs a venue's price — but
 * every partner enrols on the strength of these three numbers, so they stay.
 */
export default function AutoPodEconomicsFields() {
  const { t } = useTranslation();
  const { control, setValue, formState: { errors } } = useFormContext<PodFormValues>();
  const podAmount = useWatch({ control, name: 'pod_amount' });
  const noOfSpots = useWatch({ control, name: 'no_of_spots' });
  const podOccurrence = useWatch({ control, name: 'pod_occurrence' });
  // Floored by the sub-category's admin-set minimum, exactly as an ordinary pod.
  const spots = useSpotsBounds();
  useSpotsFloor(spots.min);
  const spotsHint =
    spots.min > 0
      ? t('podForm.paymentSection.boundsHintMin', { vars: { min: spots.min } })
      : t('podForm.autoPod.spotsHint');

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
      <TextField
        label={t('podForm.common.amount')}
        type="number"
        value={podAmount}
        onChange={(event) => setValue('pod_amount', Number(event.target.value) || 0, { shouldValidate: true })}
        error={!!errors.pod_amount}
        helperText={errors.pod_amount?.message ?? t('podForm.autoPod.priceHint')}
        fullWidth
        slotProps={{ htmlInput: { min: 1, max: 1999 } }}
      />
      <TextField
        label={t('podForm.paymentSection.noOfSpots')}
        type="number"
        value={noOfSpots}
        onChange={(event) => setValue('no_of_spots', Number(event.target.value) || 0, { shouldValidate: true })}
        error={!!errors.no_of_spots}
        helperText={errors.no_of_spots?.message ?? spotsHint}
        fullWidth
        slotProps={{ htmlInput: { min: Math.max(2, spots.min) } }}
      />
      <TextField
        select
        label={t('podForm.paymentSection.occurrence')}
        value={podOccurrence}
        onChange={(event) => setValue('pod_occurrence', event.target.value)}
        fullWidth
      >
        {OCCURRENCES.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {t(option.labelKey)}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
