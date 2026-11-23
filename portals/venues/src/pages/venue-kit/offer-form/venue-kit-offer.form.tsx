import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import {
  OFFER_FIELDS,
  offerToValues,
  valuesToOffer,
  venueKitOfferSchema,
  type VenueKitOfferFormProps,
  type VenueKitOfferOutput,
  type VenueKitOfferValues,
} from './venue-kit-offer.types';

/** Venues console → Venue Kit → Edit plan (Super Admin): the price and quantities every surface shows. */
export default function VenueKitOfferForm({ open, offer, saving, onClose, onSubmit }: Readonly<VenueKitOfferFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => venueKitOfferSchema(t), [t]);
  const defaults = useMemo(() => offerToValues(offer), [offer]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VenueKitOfferValues, unknown, VenueKitOfferOutput>({ resolver: zodResolver(schema), defaultValues: defaults });

  // Every opening starts from the plan as it is saved now.
  useEffect(() => {
    if (open) reset(defaults);
  }, [open, defaults, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="venue-kit-offer-title">
      <form onSubmit={handleSubmit((values) => onSubmit(valuesToOffer(values)))} noValidate data-testid="venue-kit-offer-form">
        <DialogTitle id="venue-kit-offer-title">{t('venueKit.console.planDialogTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>{t('venueKit.console.planDialogIntro')}</DialogContentText>
          <Grid container spacing={2}>
            {OFFER_FIELDS.map(({ name, labelKey, whole }) => (
              <Grid key={name} size={{ xs: 12, sm: 6 }}>
                <Controller
                  name={name}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      name={field.name}
                      inputRef={field.ref}
                      onBlur={field.onBlur}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value)}
                      type="number"
                      size="small"
                      fullWidth
                      required
                      label={t(`venueKit.console.fields.${labelKey}`)}
                      error={Boolean(errors[name])}
                      helperText={errors[name]?.message}
                      slotProps={{ htmlInput: { min: 0, step: whole ? 1 : 0.01, 'data-testid': `venue-kit-offer-${name}` } }}
                    />
                  )}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose} disabled={saving}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={saving} data-testid="venue-kit-offer-save">
            {t('venueKit.console.save')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
