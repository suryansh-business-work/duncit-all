import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { FoodDishPhotos } from '@duncit/venue-food';
import { RENTAL_PROOF_IMAGES_MAX } from '@duncit/utils';
import { makeRentalProofSchema } from '@duncit/forms/schemas';
import type { AddProofFormProps, RentalProofFormValues, RentalProofOutput } from './add-proof.types';

const DEFAULTS: RentalProofFormValues = { note: '', image_urls: [] };

/**
 * An optional proof on a rental: a note, photos, or both, never neither. Photos
 * go through the venue's shared photo field (the same picker and ImageKit
 * upload a rented item's photos use), so the server accepts their URLs.
 */
export default function AddProofForm({ booking, uploadSurface, busy, errorMessage, onSubmit, onCancel }: Readonly<AddProofFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeRentalProofSchema(t), [t]);
  const { control, handleSubmit } = useForm<RentalProofFormValues, unknown, RentalProofOutput>({
    defaultValues: DEFAULTS,
    resolver: zodResolver(schema) as unknown as Resolver<RentalProofFormValues, unknown, RentalProofOutput>,
  });

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))} data-testid="add-proof-form">
      <Stack spacing={2.5}>
        {errorMessage && (
          <Alert severity="error" data-testid="add-proof-error">
            {errorMessage}
          </Alert>
        )}
        <RhfTextField
          control={control}
          name="note"
          label={t('venueRentals.proof.note')}
          hint={t('venueRentals.proof.noteHint')}
          multiline
          minRows={3}
          data-testid="add-proof-note"
        />
        <Stack spacing={0.5}>
          <Typography component="h3" variant="subtitle2">
            {t('venueRentals.proof.photos')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('venueRentals.proof.photosHint', { vars: { max: RENTAL_PROOF_IMAGES_MAX } })}
          </Typography>
        </Stack>
        <Controller
          control={control}
          name="image_urls"
          render={({ field, fieldState }) => (
            <FoodDishPhotos
              images={field.value}
              limit={RENTAL_PROOF_IMAGES_MAX}
              dishName={booking.name}
              error={fieldState.error?.message}
              onChange={field.onChange}
              venueId={booking.venue_id}
              surface={uploadSurface}
            />
          )}
        />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton onClick={onCancel} disabled={busy}>
            {t('venueRentals.proof.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={busy} disabled={busy} data-testid="add-proof-save">
            {t('venueRentals.proof.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
