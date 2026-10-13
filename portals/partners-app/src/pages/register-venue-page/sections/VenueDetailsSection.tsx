import { Controller, type UseFormReturn } from 'react-hook-form';
import { Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfAdminCategoryRows } from '@duncit/category';
import { fireAndForget, logs } from '@duncit/logs';
import { AdminLocationSelect, Fieldset, MapEmbedCard, type AdminLocationValue } from '@duncit/location';
import VenueImagesField from './VenueImagesField';
import { NO_CATEGORY_LIMIT, type RegisterVenueMode, type RegisterVenueValues } from '../register-venue/register-venue.types';
import { categoryLimitMessage } from '../register-venue/register-venue.schema';
import { useTranslation } from '@duncit/shell';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  mode: RegisterVenueMode;
  /** From the registration config — the most categories one venue may have. */
  categoryLimit?: number;
}

const LOCATION_HINT = 'Where the venue is — used to match it to clubs in this locality.';

export default function VenueDetailsSection({ form, mode, categoryLimit = NO_CATEGORY_LIMIT }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, watch, setValue, trigger, formState } = form;
  const values = watch();
  // Post-approval, only the description and images stay editable here —
  // identity fields (name, category, address) are locked with disabled styling.
  const locked = mode === 'edit-approved';
  const write = (key: keyof RegisterVenueValues, value: string, validate: boolean) =>
    setValue(key, value, { shouldDirty: true, shouldValidate: validate });

  const categoryError = Boolean(formState.errors.venue_categories);

  const locValue: AdminLocationValue = {
    location_id: values.location_id,
    country: values.country,
    country_code: values.country_code,
    state: values.state,
    state_code: values.state_code,
    city: values.city,
    locality: values.locality,
    pincode: values.postal_code,
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
            label={t('partners.registerVenuePage.venueName')}
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
            label={t('partners.registerVenuePage.venueDescription')}
            required
            multiline
            minRows={3}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? 'Tell hosts what makes your space great (max 2000 characters)'}
          />
        )}
      />
      <VenueImagesField
        coverImageUrl={values.cover_image_url}
        coverError={err('cover_image_url')}
        gallery={values.gallery}
        onCoverChange={(url) => setValue('cover_image_url', url, { shouldDirty: true, shouldValidate: true })}
        onGalleryChange={(urls) => setValue('gallery', urls, { shouldDirty: true })}
      />

      <RhfAdminCategoryRows
        control={control}
        name="venue_categories"
        testId="venue-categories"
        direction={{ xs: 'column', md: 'row' }}
        required
        disabled={locked}
        max={categoryLimit}
        legend={t('partners.registerVenuePage.categoriesLegend')}
        hint={t('partners.registerVenuePage.categoriesHint')}
        labels={{
          add: t('partners.registerVenuePage.categoryAdd'),
          remove: (n) => t('partners.registerVenuePage.categoryRemove', { vars: { n } }),
          row: (n) => t('partners.registerVenuePage.categoryRow', { vars: { n } }),
          primary: t('partners.registerVenuePage.categoryPrimary'),
          duplicate: t('partners.registerVenuePage.categoryDuplicate'),
          maxReached: categoryLimitMessage(t, categoryLimit),
        }}
        icons={{ add: <AddIcon />, remove: <DeleteOutlineIcon /> }}
        components={{ Button: DuncitButton, IconButton: DuncitIconButton }}
        // Once the rows have failed validation, each pick re-checks them so a
        // fixed row loses its message without waiting for the next save.
        onRowChange={() => {
          if (categoryError) fireAndForget(trigger('venue_categories'), logs.portal['partners-app'], 'register-venue', 'revalidateCategories');
        }}
      />

      <Fieldset legend="Location" hint={LOCATION_HINT}>
        <Controller
          name="address_line1"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label={t('partners.common.addressLine1')}
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
              label={t('partners.common.addressLine2')}
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
