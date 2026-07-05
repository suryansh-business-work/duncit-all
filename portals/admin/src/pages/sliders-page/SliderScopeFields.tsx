import { useMemo } from 'react';
import { MenuItem, TextField } from '@mui/material';
import { AdminLocationSelect, buildLocationValue, type LocationDoc } from '@duncit/location';
import { SCOPES, type SliderForm } from './queries';

interface Props {
  form: SliderForm;
  setForm: React.Dispatch<React.SetStateAction<SliderForm>>;
  locations: LocationDoc[];
  superCategories: { id: string; name: string; slug: string }[];
}

export default function SliderScopeFields({
  form,
  setForm,
  locations,
  superCategories,
}: Readonly<Props>) {
  // The slider persists location_id (+ zone_name for ZONE scope); hydrate the
  // cascading picker from those saved values.
  const locValue = useMemo(
    () => buildLocationValue(locations, form.location_id, form.zone_name),
    [locations, form.location_id, form.zone_name],
  );

  return (
    <>
      <TextField
        select
        label="Super category"
        value={form.super_category_slug}
        onChange={(e) => setForm({ ...form, super_category_slug: e.target.value })}
        helperText="Leave Global to show across all super categories"
        fullWidth
      >
        <MenuItem value="">Global (all super categories)</MenuItem>
        {superCategories.map((c) => (
          <MenuItem key={c.slug} value={c.slug}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Scope"
        value={form.scope}
        onChange={(e) =>
          setForm({
            ...form,
            scope: e.target.value as any,
            ...(e.target.value === 'GLOBAL' ? { location_id: '', zone_name: '' } : {}),
            ...(e.target.value !== 'ZONE' ? { zone_name: '' } : {}),
          })
        }
        fullWidth
      >
        {SCOPES.map((s) => (
          <MenuItem key={s.value} value={s.value}>
            {s.label}
          </MenuItem>
        ))}
      </TextField>

      {(form.scope === 'LOCATION' || form.scope === 'ZONE') && (
        <AdminLocationSelect
          value={locValue}
          onChange={(next) =>
            setForm({ ...form, location_id: next.location_id, zone_name: next.locality })
          }
          fields={form.scope === 'ZONE' ? ['city', 'locality'] : ['city']}
          labels={{ locality: 'Zone' }}
          required
          legend="Location"
          hint="Where this slider shows — the city (and zone, for ZONE scope) it's scoped to."
        />
      )}
    </>
  );
}
