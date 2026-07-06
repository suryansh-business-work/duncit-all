import { Box, MenuItem, Stack, TextField } from '@mui/material';
import { AdminLocationSelect, type AdminLocationValue } from '@duncit/location';
import { AdminCategorySelect, type AdminCategoryValue } from '@duncit/category';
import MediaListField from '../MediaListField';
import MediaPickerField from '../MediaPickerField';
import { VENUE_TYPES, type Step1 } from './queries';
import VenueChecklistFields from './VenueChecklistFields';
import { getVenueError, type VenueValidationErrors } from './venue.form';

interface Props {
  s1: Step1;
  setS1: (next: Step1) => void;
  errors?: VenueValidationErrors;
}

export default function VenueDetailsSection({ s1, setS1, errors }: Readonly<Props>) {
  const set = (patch: Partial<Step1>) => setS1({ ...s1, ...patch });
  const err = (field: string) => getVenueError(errors, `step1.${field}`);

  const locationValue: AdminLocationValue = {
    location_id: s1.location_id,
    country: s1.country,
    country_code: s1.country_code,
    state: s1.state,
    state_code: s1.state_code,
    city: s1.city,
    locality: s1.locality,
    pincode: s1.postal_code,
  };
  const applyLocation = (value: AdminLocationValue) =>
    set({
      location_id: value.location_id,
      country: value.country,
      country_code: value.country_code,
      state: value.state,
      state_code: value.state_code,
      city: value.city,
      locality: value.locality,
      postal_code: value.pincode,
    });

  const categoryValue: AdminCategoryValue = {
    super_id: s1.venue_category.super_category_id,
    super_name: s1.venue_category.super_category_name,
    category_id: s1.venue_category.category_id,
    category_name: s1.venue_category.category_name,
    sub_id: s1.venue_category.sub_category_id,
    sub_name: s1.venue_category.sub_category_name,
  };
  const applyCategory = (value: AdminCategoryValue) =>
    set({
      venue_category: {
        super_category_id: value.super_id,
        super_category_name: value.super_name,
        category_id: value.category_id,
        category_name: value.category_name,
        sub_category_id: value.sub_id,
        sub_category_name: value.sub_name,
      },
    });

  return (
    <Stack spacing={1.5}>
      <Box
        sx={{
          display: 'grid',
          columnGap: 1.5,
          rowGap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        }}
      >
        <TextField label="Venue name *" size="small" value={s1.venue_name} onChange={(e) => set({ venue_name: e.target.value })} error={!!err('venue_name')} helperText={err('venue_name') || undefined} />
        <TextField select label="Type" size="small" value={s1.venue_type} onChange={(e) => set({ venue_type: e.target.value })} error={!!err('venue_type')} helperText={err('venue_type') || undefined}>
          {VENUE_TYPES.map((t) => (
            <MenuItem key={t} value={t}>{t}</MenuItem>
          ))}
        </TextField>
        <TextField label="Capacity" type="number" size="small" value={s1.capacity} onChange={(e) => set({ capacity: Number(e.target.value) })} error={!!err('capacity')} helperText={err('capacity') || undefined} />
        <TextField sx={{ gridColumn: '1 / -1' }} label="Address line 1 *" size="small" value={s1.address_line1} onChange={(e) => set({ address_line1: e.target.value })} error={!!err('address_line1')} helperText={err('address_line1') || undefined} />
        <TextField sx={{ gridColumn: '1 / -1' }} label="Address line 2" size="small" value={s1.address_line2} onChange={(e) => set({ address_line2: e.target.value })} />
        <TextField sx={{ gridColumn: '1 / -1' }} label="Description" size="small" multiline minRows={2} value={s1.description} onChange={(e) => set({ description: e.target.value })} error={!!err('description')} helperText={err('description') || undefined} />
        <TextField
          sx={{ gridColumn: '1 / -1' }}
          label="Tags"
          size="small"
          value={s1.tags.join(', ')}
          onChange={(e) =>
            set({ tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })
          }
          helperText="Comma separated tags shown on approved venue cards."
        />
      </Box>

      <AdminLocationSelect
        value={locationValue}
        onChange={applyLocation}
        fields={['country', 'state', 'city', 'locality']}
        required
        legend="Location"
        hint="Pick the venue's Country → State → City → Locality from the admin location list."
        errors={{
          country: err('country') || undefined,
          state: err('state') || undefined,
          city: err('city') || err('location_id') || undefined,
          locality: err('locality') || undefined,
        }}
      />

      <AdminCategorySelect
        value={categoryValue}
        onChange={applyCategory}
        legend="Category"
        hint="Super → Category → Sub the venue hosts pods in — used to auto-match clubs by location + category."
        errors={{
          super: err('venue_category.super_category_id') || undefined,
          sub: err('venue_category.sub_category_id') || undefined,
        }}
      />

      <VenueChecklistFields s1={s1} set={set} />

      <MediaPickerField
        label="Cover image"
        value={s1.cover_image_url}
        onChange={(url) => set({ cover_image_url: url })}
        helperText={err('cover_image_url') || undefined}
        folder="/venues/cover"
      />
      <MediaListField
        label="Other images"
        value={s1.gallery.join('\n')}
        onChange={(value) => set({ gallery: value.split('\n').map((url) => url.trim()).filter(Boolean) })}
        folder="/venues/gallery"
        helperText="Additional venue photos shown on the public venue page."
      />
    </Stack>
  );
}
