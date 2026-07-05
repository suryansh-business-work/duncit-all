import { useEffect, useMemo, useState } from 'react';
import { Stack, Switch, TextField, Typography } from '@mui/material';
import {
  AdminLocationSelect,
  buildLocationValue,
  EMPTY_LOCATION,
  type AdminLocationValue,
  type LocationDoc,
} from '@duncit/location';
import {
  AdminCategorySelect,
  buildCategoryValue,
  EMPTY_CATEGORY,
  type AdminCategoryValue,
  type CategoryDoc,
} from '@duncit/category';
import type { ClubForm } from '../queries';

interface Props {
  form: ClubForm;
  setForm: (f: ClubForm | ((prev: ClubForm) => ClubForm)) => void;
  superCats: any[];
  allCats: any[];
  locations: LocationDoc[];
}

const CATEGORY_HINT =
  'Venues auto-match to this club by location + category — pick the same Super & Sub the venues sit under.';
const LOCATION_HINT =
  'The city (and optional locality) the club operates in. Approved venues here in the same category auto-link to this club.';

/** Basic club fields + the shared Category (Super → Category → Sub) and Location
 * (Country → State → City → Locality) pickers, each in its own hinted fieldset.
 * The club persists super_category_id + category_id (the sub) + location_id +
 * locality. Location + category together drive the auto-matched venues. */
export default function BasicClubSection({ form, setForm, allCats, locations }: Readonly<Props>) {
  // Both pickers keep their own full cascade value; the club persists only the
  // ids. Hydrate from the saved ids when a club is opened for editing.
  const initialLocation = useMemo<AdminLocationValue>(
    () => (form.location_id ? buildLocationValue(locations, form.location_id, form.locality) : EMPTY_LOCATION),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.id, locations.length],
  );
  const [locValue, setLocValue] = useState<AdminLocationValue>(initialLocation);
  useEffect(() => setLocValue(initialLocation), [initialLocation]);

  const initialCategory = useMemo<AdminCategoryValue>(
    () => buildCategoryValue(allCats as CategoryDoc[], form.super_category_id, form.category_id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.id, allCats.length],
  );
  const [catValue, setCatValue] = useState<AdminCategoryValue>(initialCategory);
  useEffect(() => setCatValue(initialCategory), [initialCategory]);

  return (
    <Stack spacing={2}>
      <TextField
        label="Club name"
        value={form.club_name}
        onChange={(e) => setForm({ ...form, club_name: e.target.value })}
        fullWidth
        required
        helperText={
          form.id
            ? `URL slug: ${form.club_id || '—'}`
            : 'A URL-friendly slug is auto-generated from this name'
        }
      />
      <TextField label="Description" value={form.club_description} onChange={(e) => setForm({ ...form, club_description: e.target.value })} fullWidth multiline minRows={2} />

      <AdminCategorySelect
        value={catValue}
        onChange={(next) => {
          setCatValue(next);
          setForm((prev) => ({ ...prev, super_category_id: next.super_id, category_id: next.sub_id }));
        }}
        direction="row"
        legend="Category"
        hint={CATEGORY_HINT}
      />

      <AdminLocationSelect
        value={locValue}
        onChange={(next) => {
          setLocValue(next);
          setForm((prev) => ({ ...prev, location_id: next.location_id, locality: next.locality }));
        }}
        fields={['country', 'state', 'city', 'locality']}
        direction="row"
        legend="Location"
        hint={LOCATION_HINT}
      />

      {form.id && (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Switch checked={form.is_active} onChange={(_, value) => setForm({ ...form, is_active: value })} />
          <Typography variant="body2">{form.is_active ? 'Active' : 'Inactive'}</Typography>
        </Stack>
      )}
    </Stack>
  );
}
