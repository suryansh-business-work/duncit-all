import { Controller, type UseFormReturn } from 'react-hook-form';
import { Stack, TextField } from '@mui/material';
import { AdminCategorySelect, type AdminCategoryValue } from '@duncit/category';
import { AdminLocationSelect, Fieldset, MapEmbedCard, type AdminLocationValue } from '@duncit/location';
import VenueImagesField from './VenueImagesField';
import type { RegisterVenueMode, RegisterVenueValues } from '../register-venue';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  mode: RegisterVenueMode;
}

const CATEGORY_HINT = 'Pick the category you want to host pods in at this venue.';
const LOCATION_HINT = 'Where the venue is — used to match it to clubs in this locality.';

export default function VenueDetailsSection({ form, mode }: Readonly<Props>) {
  const { control, watch, setValue, formState } = form;
  const values = watch();
  // Post-approval, only the description and images stay editable here —
  // identity fields (name, category, address) are locked with disabled styling.
  const locked = mode === 'edit-approved';
  const write = (key: keyof RegisterVenueValues, value: string, validate: boolean) =>
    setValue(key, value, { shouldDirty: true, shouldValidate: validate });

  const catValue: AdminCategoryValue = {
    super_id: values.super_category_id ?? '',
    super_name: '',
    category_id: values.category_id ?? '',
    category_name: '',
    sub_id: values.sub_category_id ?? '',
    sub_name: '',
  };
  const categoryError = Boolean(
    formState.errors.super_category_id || formState.errors.category_id || formState.errors.sub_category_id
  );

  const locValue: AdminLocationValue = {
    location_id: values.location_id ?? '',
    country: values.country ?? '',
    country_code: values.country_code ?? '',
    state: values.state ?? '',
    state_code: values.state_code ?? '',
    city: values.city ?? '',
    locality: values.locality ?? '',
    pincode: values.postal_code ?? '',
  };
  const err = (key: keyof RegisterVenueValues) => String(formState.errors[key]?.message ?? '') || undefined;

  return (
    <Stack spacing={2.5}>
      <Controller
        name="venue_name"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Venue name"
            required
            disabled={locked}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? (locked ? 'Locked after approval' : 'Public name shown to hosts and guests')}
          />
        )}
      />
      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Venue description"
            multiline
            minRows={3}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? 'Tell hosts what makes your space great (max 2000 characters)'}
          />
        )}
      />
      <VenueImagesField
        coverImageUrl={values.cover_image_url}
        gallery={values.gallery}
        onCoverChange={(url) => setValue('cover_image_url', url, { shouldDirty: true })}
        onGalleryChange={(urls) => setValue('gallery', urls, { shouldDirty: true })}
      />

      <AdminCategorySelect
        value={catValue}
        onChange={(next) => {
          write('super_category_id', next.super_id, categoryError);
          write('category_id', next.category_id, categoryError);
          write('sub_category_id', next.sub_id, categoryError);
        }}
        direction="row"
        required
        disabled={locked}
        legend="Venue category"
        hint={CATEGORY_HINT}
        errors={categoryError ? { sub: 'Select the super category, category and sub category.' } : undefined}
      />

      <Fieldset legend="Location" hint={LOCATION_HINT}>
        <Controller
          name="address_line1"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Address line 1"
              required
              disabled={locked}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message ?? (locked ? 'Locked after approval' : 'Building / street — shown on the venue page')}
            />
          )}
        />
        <Controller
          name="address_line2"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Address line 2"
              disabled={locked}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message ?? (locked ? 'Locked after approval' : 'Landmark or floor (optional)')}
            />
          )}
        />
        <AdminLocationSelect
          value={locValue}
          onChange={(next) => {
            const validate = categoryError || Boolean(formState.errors.city);
            write('location_id', next.location_id, validate);
            write('country', next.country, validate);
            write('country_code', next.country_code, validate);
            write('state', next.state, validate);
            write('state_code', next.state_code, validate);
            write('city', next.city, validate);
            write('locality', next.locality, validate);
            write('postal_code', next.pincode, validate);
          }}
          fields={['country', 'state', 'city', 'locality']}
          direction="row"
          required
          disabled={locked}
          errors={{ country: err('country'), state: err('state'), city: err('city'), locality: err('locality') }}
        />
      </Fieldset>

      <MapEmbedCard
        parts={[
          values.address_line1,
          values.address_line2,
          values.locality,
          values.city,
          values.state,
          values.postal_code,
          values.country,
        ]}
        apiKey={import.meta.env.VITE_GOOGLE_MAP_API as string | undefined}
        hideWhenKeyMissing
      />
    </Stack>
  );
}
