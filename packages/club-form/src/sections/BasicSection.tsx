import { useEffect, useState } from 'react';
import { Stack, Switch, Typography } from '@mui/material';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import {
  AdminCategorySelect,
  buildCategoryValue,
  EMPTY_CATEGORY,
  useAdminCategories,
  type AdminCategoryValue,
} from '@duncit/category';
import {
  AdminLocationSelect,
  buildLocationValue,
  EMPTY_LOCATION,
  useAdminLocations,
  type AdminLocationValue,
} from '@duncit/location';
import RhfTextField from '../components/RhfTextField';
import { useClubFormData } from '../context';
import type { ClubFormValues } from '../types';

const CATEGORY_HINT =
  'Venues auto-match to this club by location + category — pick the same Super & Sub the venues sit under.';
const LOCATION_HINT = 'Approved venues here in the same category auto-link to this club.';

/** Basic club fields + the shared Category and Location cascade pickers. The
 * club persists super_category_id + category_id (sub) + location_id + locality;
 * the pickers keep their full cascade value in local state so the middle levels
 * survive editing. */
export default function BasicSection() {
  const { config } = useClubFormData();
  const { control, setValue, getValues } = useFormContext<ClubFormValues>();
  const { errors } = useFormState({ control });
  const clubDocId = useWatch({ control, name: 'id' });
  const isVerified = useWatch({ control, name: 'is_verified' });
  const isActive = useWatch({ control, name: 'is_active' });
  const { categories } = useAdminCategories();
  const { locations } = useAdminLocations();

  const [catValue, setCatValue] = useState<AdminCategoryValue>(EMPTY_CATEGORY);
  const [locValue, setLocValue] = useState<AdminLocationValue>(EMPTY_LOCATION);

  // Re-hydrate the pickers from the persisted ids when a different club loads or
  // the admin lists arrive.
  useEffect(() => {
    setCatValue(buildCategoryValue(categories, getValues('super_category_id'), getValues('category_id')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubDocId, categories.length]);
  useEffect(() => {
    setLocValue(buildLocationValue(locations, getValues('location_id'), getValues('locality')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubDocId, locations.length]);

  const slugHint = clubDocId
    ? `URL slug: ${getValues('club_id') || '—'}`
    : 'A URL-friendly slug is auto-generated from this name';

  return (
    <Stack spacing={2}>
      <RhfTextField control={control} name="club_name" label="Club name" required hint={slugHint} />
      <RhfTextField
        control={control}
        name="club_description"
        label="Description"
        required
        multiline
        minRows={2}
        hint="A short intro shown at the top of the club page."
      />

      <AdminCategorySelect
        value={catValue}
        onChange={(next) => {
          setCatValue(next);
          setValue('super_category_id', next.super_id);
          setValue('category_id', next.sub_id);
        }}
        direction="row"
        required
        legend="Category"
        hint={CATEGORY_HINT}
        errors={{ super: errors.super_category_id?.message, sub: errors.category_id?.message }}
      />

      <AdminLocationSelect
        value={locValue}
        onChange={(next) => {
          setLocValue(next);
          setValue('location_id', next.location_id);
          setValue('locality', next.locality);
        }}
        fields={['country', 'state', 'city', 'locality']}
        direction="row"
        required
        legend="Location"
        hint={LOCATION_HINT}
        errors={{ city: errors.location_id?.message }}
      />

      {config.showVerified && (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Switch checked={!!isVerified} onChange={(_, value) => setValue('is_verified', value)} />
          <Typography variant="body2">{isVerified ? 'Verified club' : 'Not verified'}</Typography>
        </Stack>
      )}
      {config.showIsActive && clubDocId && (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Switch checked={!!isActive} onChange={(_, value) => setValue('is_active', value)} />
          <Typography variant="body2">{isActive ? 'Active' : 'Inactive'}</Typography>
        </Stack>
      )}
    </Stack>
  );
}
