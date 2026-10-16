import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Controller, useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, FormControlLabel, FormHelperText, Stack, Switch, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { emptyRentalItem, parseApiError, rentalItemsToValues, toVenueRentalsInput, type RentalItemsValues } from '@duncit/utils';
import { UPDATE_VENUE_RENTALS } from '../documents';
import RentalItemFields from './RentalItemFields';
import { makeRentalItemsSchema, type RentalItemsOutput } from './rental-items.schema';
import type { RentalItemsFormProps } from './rental-items.types';

/**
 * A venue's rented items: whether it rents at all, and the list. Saved whole
 * through the approved-venue edit; every kept item sends its id, so the
 * bookings already made on it stay linked to it.
 */
export default function RentalItemsForm({ venue, config, upload, idPrefix, onSaved }: Readonly<RentalItemsFormProps>) {
  const { t } = useTranslation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [save, { loading }] = useMutation(UPDATE_VENUE_RENTALS);
  const schema = useMemo(() => makeRentalItemsSchema(t, config), [t, config]);
  const { control, handleSubmit, reset, formState } = useForm<RentalItemsValues, unknown, RentalItemsOutput>({
    defaultValues: rentalItemsToValues(venue),
    resolver: zodResolver(schema) as unknown as Resolver<RentalItemsValues, unknown, RentalItemsOutput>,
    mode: 'onBlur',
  });
  const items = useFieldArray({ control, name: 'items' });
  const atLimit = items.fields.length >= config.rental_item_limit;

  const submit = async (values: RentalItemsOutput) => {
    setApiError(null);
    try {
      const res = await save({ variables: { venue_id: venue.id, input: toVenueRentalsInput(values) } });
      const saved = res.data?.updateApprovedVenue;
      if (!saved) return;
      // The form re-opens on what was stored: new items now carry their ids.
      reset(rentalItemsToValues(saved));
      notifySuccess(t('venueRentals.items.saved'));
      onSaved?.(saved);
    } catch (error) {
      setApiError(parseApiError(error));
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(submit)} data-testid={`${idPrefix}-form`}>
      <Stack spacing={2.5}>
        <Typography variant="body2" color="text.secondary">
          {t('venueRentals.items.subtitle')}
        </Typography>
        {apiError && (
          <Alert severity="error" data-testid={`${idPrefix}-error`}>
            {apiError}
          </Alert>
        )}
        <Controller
          control={control}
          name="offers_rentals"
          render={({ field }) => (
            <Stack spacing={0.25}>
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(_e, checked) => field.onChange(checked)} />}
                label={t('venueRentals.items.offers')}
              />
              <FormHelperText sx={{ mt: 0 }}>{t('venueRentals.items.offersHint')}</FormHelperText>
            </Stack>
          )}
        />
        {items.fields.length === 0 && <Alert severity="info">{t('venueRentals.items.empty')}</Alert>}
        {items.fields.map((item, index) => (
          <RentalItemFields
            key={item.id}
            control={control}
            index={index}
            config={config}
            upload={upload}
            idPrefix={idPrefix}
            onRemove={() => items.remove(index)}
          />
        ))}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
          <DuncitButton startIcon={<AddIcon />} disabled={atLimit} onClick={() => items.append(emptyRentalItem())}>
            {t('venueRentals.items.add')}
          </DuncitButton>
          <DuncitButton
            type="submit"
            variant="contained"
            loading={loading}
            disabled={loading || !formState.isDirty}
            data-testid={`${idPrefix}-save`}
          >
            {t('venueRentals.items.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
