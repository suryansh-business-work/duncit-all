import { useEffect } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Box, MenuItem, Slider, Stack, Switch, TextField, Typography } from '@mui/material';
import { payableSpots } from '@duncit/utils';
import { useSpotsBounds } from '../useSpotsBounds';
import EarningsProjection from '../components/EarningsProjection';
import PlaceChargesField from '../components/PlaceChargesField';
import { getProductRequestTotal } from '../build-input';
import { usePodFormData } from '../context';
import { OCCURRENCES, POD_TYPES, type PodFormValues } from '../types';
import { useTranslation } from '../i18n/useTranslation';

export default function PaymentSection() {
  const { t } = useTranslation();
  const { config, finance, products } = usePodFormData();
  const { control, register, getValues, setValue, formState: { errors } } = useFormContext<PodFormValues>();
  const podType = useWatch({ control, name: 'pod_type' });
  const podOccurrence = useWatch({ control, name: 'pod_occurrence' });
  const podAmount = useWatch({ control, name: 'pod_amount' });
  const noOfSpots = useWatch({ control, name: 'no_of_spots' });
  const podMode = useWatch({ control, name: 'pod_mode' });
  const productRequests = useWatch({ control, name: 'product_requests' });
  const isActive = useWatch({ control, name: 'is_active' });
  const isEdit = !!getValues('pod_id');
  const isFree = podType.includes('FREE');
  // Priced off the ROWS, not `products_enabled` — the switch that used to drive
  // that flag is gone and buildPodInput now derives it, so watching it here
  // would leave the breakdown at ₹0 no matter what the admin attached.
  const productCost = config.showInventory
    ? getProductRequestTotal(productRequests, products)
    : 0;
  // The activity's minimum and the booked space's capacity. A slider only when
  // both ends are real — otherwise the number field, still floored.
  const spots = useSpotsBounds();
  const boundsHint = (() => {
    if (spots.slidable) {
      return `This activity needs at least ${spots.min}, and the space booked holds ${spots.max}.`;
    }
    return spots.min > 0 ? `This activity needs at least ${spots.min} people.` : undefined;
  })();
  // The control clamps what it DISPLAYS to the activity's minimum, so without
  // this the form could still hold a smaller number than the admin was shown and
  // save it. Raise to the floor once the floor is known; never lower, so a
  // legitimately larger pod is left alone. (Sections stay mounted when the
  // accordion is collapsed, so this runs regardless.)
  useEffect(() => {
    if (spots.min > 0 && (Number(getValues('no_of_spots')) || 0) < spots.min) {
      setValue('no_of_spots', spots.min, { shouldValidate: true });
    }
  }, [spots.min]); // eslint-disable-line react-hooks/exhaustive-deps
  // An Auto Pod is never free, so its floor is 1 rather than 0.
  const amountFloor = config.autoPod ? 1 : 0;
  const paidHint = config.autoPod
    ? t('podForm.autoPod.priceHint')
    : 'GROSS price (incl. fee + GST). 0 – 1999.';
  const amountHint = isFree ? 'Free pod — amount must be 0' : paidHint;
  // The host takes one spot for free, so only (total - 1) spots are ever billed.
  const billableSpots = payableSpots(Number(noOfSpots) || 0);
  const spotsHint = isFree
    ? 'Total spots, including the host’s own seat.'
    : `The host’s spot is free — the calculation is based on total spots − 1 (${Number(noOfSpots) || 0} − 1 = ${billableSpots}).`;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {/* An Auto Pod is physical and never free — its type is fixed, not chosen. */}
        {!config.autoPod && (
          <TextField
            select
            label={t('podForm.paymentSection.podType')}
            value={podType}
            onChange={(event) => {
              setValue('pod_type', event.target.value, { shouldValidate: true });
              if (event.target.value.includes('FREE')) setValue('pod_amount', 0);
            }}
            fullWidth
          >
            {POD_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </TextField>
        )}
        <TextField
          select
          label={t('podForm.paymentSection.occurrence')}
          value={podOccurrence}
          onChange={(event) => setValue('pod_occurrence', event.target.value)}
          fullWidth
        >
          {OCCURRENCES.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </TextField>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{
        alignItems: "flex-start"
      }}>
        <TextField
          label={t('podForm.common.amount')}
          type="number"
          value={podAmount}
          onChange={(event) => setValue('pod_amount', Number(event.target.value) || 0, { shouldValidate: true })}
          disabled={isFree}
          helperText={errors.pod_amount?.message || amountHint}
          error={!!errors.pod_amount}
          fullWidth
          slotProps={{
            htmlInput: { min: amountFloor, max: 1999 }
          }}
        />
        {spots.slidable ? (
          <Box sx={{ flex: 1, minWidth: 200 }} data-testid="pod-spots-slider">
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              No. of spots
            </Typography>
            <Slider
              value={Math.max(spots.min, Math.min(spots.max, Number(noOfSpots) || 0))}
              min={spots.min}
              max={spots.max}
              step={1}
              marks={[
                { value: spots.min, label: String(spots.min) },
                { value: spots.max, label: String(spots.max) },
              ]}
              valueLabelDisplay="on"
              // Single-value slider, so `next` is always a number.
              onChange={(_e, next) => setValue('no_of_spots', next as number, { shouldValidate: true })}
              aria-label={t('podForm.paymentSection.noOfSpots')}
            />
            <Typography variant="caption" color={errors.no_of_spots ? 'error' : 'text.secondary'}>
              {errors.no_of_spots?.message ?? boundsHint}
            </Typography>
          </Box>
        ) : (
          <TextField
            label={t('podForm.paymentSection.noOfSpots')}
            type="number"
            value={noOfSpots}
            onChange={(event) => setValue('no_of_spots', Number(event.target.value) || 0, { shouldValidate: true })}
            fullWidth
            error={!!errors.no_of_spots}
            helperText={errors.no_of_spots?.message ?? boundsHint ?? spotsHint}
            slotProps={{
              htmlInput: { min: spots.min }
            }}
          />
        )}
        {config.showIsActive && isEdit && (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              pt: 1,
              flexShrink: 0
            }}>
            <Switch checked={isActive} onChange={(_, v) => setValue('is_active', v)} />
            <Typography variant="body2">{isActive ? 'Active' : 'Inactive'}</Typography>
          </Stack>
        )}
      </Stack>
      {config.showFinance && !isFree && Number(podAmount) > 0 && finance && (
        <EarningsProjection productCost={productCost} />
      )}
      <TextField
        label={t('podForm.common.paymentTerms')}
        fullWidth
        multiline
        minRows={3}
        helperText={t('podForm.paymentSection.refundPolicyCancellationTaxInfo')}
        {...register('payment_terms')}
      />
      {config.showPlaceCharges && podMode === 'PHYSICAL' && (
        <Controller
          control={control}
          name="place_charges"
          render={({ field }) => (
            <PlaceChargesField
              value={field.value}
              onChange={field.onChange}
              helperText={t('podForm.paymentSection.optionalVenueSideChargesEntryTable')}
            />
          )}
        />
      )}
    </Stack>
  );
}
