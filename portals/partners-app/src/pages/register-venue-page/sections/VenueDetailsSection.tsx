import { Controller, type UseFormReturn } from 'react-hook-form';
import { Stack, TextField, Typography } from '@mui/material';
import CategoryCascade from '../../list-products-page/list-products/CategoryCascade';
import VenueMapPreview from '../../../components/VenueMapPreview';
import VenueLocationFields from '../VenueLocationFields';
import VenueLocationFinder from '../VenueLocationFinder';
import VenueImagesField from './VenueImagesField';
import type { RegisterVenueValues, VenueLocationValues } from '../register-venue';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  locations: any[];
}

const LOCATION_KEYS: (keyof VenueLocationValues)[] = [
  'location_id',
  'country',
  'country_code',
  'state',
  'state_code',
  'city',
  'locality',
  'postal_code',
];

export default function VenueDetailsSection({ form, locations }: Readonly<Props>) {
  const { control, watch, setValue, formState } = form;
  const values = watch();

  const locationValue: VenueLocationValues = {
    location_id: values.location_id ?? '',
    country: values.country ?? '',
    country_code: values.country_code ?? '',
    state: values.state ?? '',
    state_code: values.state_code ?? '',
    city: values.city ?? '',
    locality: values.locality ?? '',
    postal_code: values.postal_code ?? '',
  };
  const applyLocation = (next: VenueLocationValues) => {
    LOCATION_KEYS.forEach((key) => {
      setValue(key, next[key] ?? '', { shouldDirty: true, shouldValidate: Boolean(formState.errors[key]) });
    });
  };
  const locationErrors = Object.fromEntries(
    LOCATION_KEYS.filter((key) => formState.errors[key]).map((key) => [
      key,
      String(formState.errors[key]?.message ?? ''),
    ])
  ) as Partial<Record<keyof VenueLocationValues, string>>;
  const categoryError = Boolean(
    formState.errors.super_category_id || formState.errors.category_id || formState.errors.sub_category_id
  );

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
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? ' '}
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
            helperText={fieldState.error?.message ?? 'Tell hosts what makes your space great'}
          />
        )}
      />
      <VenueImagesField
        coverImageUrl={values.cover_image_url}
        gallery={values.gallery}
        onCoverChange={(url) => setValue('cover_image_url', url, { shouldDirty: true })}
        onGalleryChange={(urls) => setValue('gallery', urls, { shouldDirty: true })}
      />
      <Stack spacing={0.75}>
        <Typography variant="subtitle2" fontWeight={800}>
          Venue category{' '}
          <Typography component="span" variant="caption" color="error.main" fontWeight={800}>
            (required)
          </Typography>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Pick the category you want to host pods in at this venue.
        </Typography>
        <CategoryCascade
          superId={values.super_category_id}
          categoryId={values.category_id}
          subId={values.sub_category_id}
          error={categoryError}
          onChange={(next) => {
            setValue('super_category_id', next.superId, { shouldDirty: true, shouldValidate: categoryError });
            setValue('category_id', next.categoryId, { shouldDirty: true, shouldValidate: categoryError });
            setValue('sub_category_id', next.subId, { shouldDirty: true, shouldValidate: categoryError });
          }}
        />
        {categoryError && (
          <Typography variant="caption" color="error.main">
            Select the super category, category and sub category.
          </Typography>
        )}
      </Stack>
      <Controller
        name="address_line1"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Address line 1"
            required
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? ' '}
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
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? ' '}
          />
        )}
      />
      <VenueLocationFinder locations={locations} value={locationValue} onChange={applyLocation} />
      <VenueLocationFields
        value={locationValue}
        locations={locations}
        onChange={applyLocation}
        errors={locationErrors}
        showAllErrors
      />
      <VenueMapPreview
        parts={[
          values.address_line1,
          values.address_line2,
          values.locality,
          values.city,
          values.state,
          values.postal_code,
          values.country,
        ]}
      />
    </Stack>
  );
}
