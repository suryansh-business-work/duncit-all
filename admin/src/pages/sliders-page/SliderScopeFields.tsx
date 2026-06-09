import { MenuItem, TextField } from '@mui/material';
import { SCOPES, type SliderForm } from './queries';

interface Props {
  form: SliderForm;
  setForm: React.Dispatch<React.SetStateAction<SliderForm>>;
  locations: any[];
  zonesForLocation: any[];
  superCategories: { id: string; name: string; slug: string }[];
}

export default function SliderScopeFields({
  form,
  setForm,
  locations,
  zonesForLocation,
  superCategories,
}: Readonly<Props>) {
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
        <TextField
          select
          label="Location"
          value={form.location_id}
          onChange={(e) => setForm({ ...form, location_id: e.target.value, zone_name: '' })}
          fullWidth
          required
        >
          {locations.map((l: any) => (
            <MenuItem key={l.id} value={l.id}>
              {l.location_name}
            </MenuItem>
          ))}
        </TextField>
      )}

      {form.scope === 'ZONE' && (
        <TextField
          select
          label="Zone"
          value={form.zone_name}
          onChange={(e) => setForm({ ...form, zone_name: e.target.value })}
          fullWidth
          required
          disabled={!form.location_id}
          helperText={!form.location_id ? 'Select a location first' : ''}
        >
          {zonesForLocation.map((z: any) => (
            <MenuItem key={z.zone_name} value={z.zone_name}>
              {z.zone_name}
            </MenuItem>
          ))}
        </TextField>
      )}
    </>
  );
}
