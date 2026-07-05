import { useEffect, useMemo, useState } from 'react';
import { MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import {
  AdminLocationSelect,
  buildLocationValue,
  EMPTY_LOCATION,
  type AdminLocationValue,
  type LocationDoc,
} from '@duncit/location';
import type { ClubForm } from '../queries';

interface Props {
  form: ClubForm;
  setForm: (f: ClubForm | ((prev: ClubForm) => ClubForm)) => void;
  superCats: any[];
  allCats: any[];
  locations: LocationDoc[];
}

/** Basic club fields + the full Super → Category → Sub Category cascade + the
 * club's location. The club persists super_category_id + category_id (the sub);
 * the middle level narrows the sub list and is re-derived from the saved sub
 * when editing. Location + category together drive the auto-matched venues. */
export default function BasicClubSection({ form, setForm, superCats, allCats, locations }: Readonly<Props>) {
  const selectedSub = allCats.find((c: any) => c.id === form.category_id);
  const [midId, setMidId] = useState<string>(selectedSub?.parent_id ?? '');

  // The cascading picker keeps its own full country/state/city value; the club
  // persists only location_id. Hydrate from the saved id when editing.
  const initialLocation = useMemo<AdminLocationValue>(
    () => (form.location_id ? buildLocationValue(locations, form.location_id, form.locality) : EMPTY_LOCATION),
    // Re-hydrate when a different club is opened or the location list arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.id, locations.length],
  );
  const [locValue, setLocValue] = useState<AdminLocationValue>(initialLocation);
  useEffect(() => setLocValue(initialLocation), [initialLocation]);

  // Re-derive the middle level when a different club is opened for editing.
  useEffect(() => {
    setMidId(selectedSub?.parent_id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id]);

  const midCats = allCats.filter(
    (c: any) =>
      c.level === 'CATEGORY' && (!form.super_category_id || c.parent_id === form.super_category_id)
  );
  const midIdSet = new Set(midCats.map((c: any) => c.id));
  const subCats = allCats.filter((c: any) => {
    if (c.level !== 'SUB') return false;
    if (midId) return c.parent_id === midId;
    if (form.super_category_id) return midIdSet.has(c.parent_id);
    return true;
  });

  const onSuperChange = (value: string) => {
    setMidId('');
    setForm({ ...form, super_category_id: value, category_id: '' });
  };
  const onMidChange = (value: string) => {
    setMidId(value);
    setForm({ ...form, category_id: '' });
  };

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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Super Category" select value={form.super_category_id} onChange={(e) => onSuperChange(e.target.value)} fullWidth helperText="Drives the app feed grouping.">
          <MenuItem value="">None</MenuItem>
          {superCats.map((category: any) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
        </TextField>
        <TextField label="Category" select value={midId} onChange={(e) => onMidChange(e.target.value)} fullWidth helperText="Narrows the sub-category list.">
          <MenuItem value="">None</MenuItem>
          {midCats.map((category: any) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
        </TextField>
        <TextField label="Sub Category" select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} fullWidth>
          <MenuItem value="">None</MenuItem>
          {subCats.map((category: any) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
        </TextField>
      </Stack>
      <Stack spacing={0.5}>
        <AdminLocationSelect
          value={locValue}
          onChange={(next) => {
            setLocValue(next);
            setForm((prev) => ({ ...prev, location_id: next.location_id, locality: next.locality }));
          }}
          fields={['country', 'state', 'city', 'locality']}
          direction="row"
        />
        <Typography variant="caption" color="text.secondary">
          The city (and optional locality) the club operates in. Approved venues here in the same
          category auto-link to this club.
        </Typography>
      </Stack>
      {form.id && (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Switch checked={form.is_active} onChange={(_, value) => setForm({ ...form, is_active: value })} />
          <Typography variant="body2">{form.is_active ? 'Active' : 'Inactive'}</Typography>
        </Stack>
      )}
    </Stack>
  );
}
