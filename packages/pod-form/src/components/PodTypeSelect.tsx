import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { MenuItem, TextField } from '@mui/material';
import { usePodFormData } from '../context';
import { useTranslation } from '../i18n/useTranslation';
import { isFreePodType, normalizePodType } from '../pod-type';
import { offersFreeVenue } from '../schema';
import { POD_TYPES, type PodFormValues } from '../types';

/**
 * The pod's type, Free or Paid. A pod asking its venue for the window free is
 * free too — a free venue carries no charges, commission or earnings — so Paid
 * goes and Free is picked (the server refuses a free venue for a paid pod:
 * FREE_VENUE_NEEDS_FREE_POD). mWeb / native twin: PodTypeCards.
 */
export default function PodTypeSelect() {
  const { t } = useTranslation();
  const { config } = usePodFormData();
  const { control, setValue } = useFormContext<PodFormValues>();
  const values = useWatch({ control }) as PodFormValues;
  const isFree = isFreePodType(values.pod_type);
  const freeVenue = offersFreeVenue(values, config);

  useEffect(() => {
    if (!freeVenue || isFree) return;
    setValue('pod_type', 'FREE', { shouldValidate: true });
    setValue('pod_amount', 0);
  }, [freeVenue, isFree, setValue]);

  const options = freeVenue ? POD_TYPES.filter((option) => isFreePodType(option.value)) : POD_TYPES;
  return (
    <TextField
      select
      label={t('podForm.paymentSection.podType')}
      value={normalizePodType(values.pod_type)}
      onChange={(event) => {
        setValue('pod_type', event.target.value, { shouldValidate: true });
        if (isFreePodType(event.target.value)) setValue('pod_amount', 0);
      }}
      helperText={freeVenue ? t('podForm.paymentSection.freeVenueTicket') : undefined}
      fullWidth
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {t(option.labelKey)}
        </MenuItem>
      ))}
    </TextField>
  );
}
