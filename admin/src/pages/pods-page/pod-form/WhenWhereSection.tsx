import { useFormikContext } from 'formik';
import { MenuItem, Stack, TextField } from '@mui/material';
import type { PodForm } from '../queries';

interface Props {
  clubs: any[];
  filteredLocations: any[];
  zoneOptions: string[];
}

export default function WhenWhereSection({ clubs, filteredLocations, zoneOptions }: Props) {
  const { values, errors, touched, handleChange, setFieldValue } = useFormikContext<PodForm>();
  const err = (k: keyof PodForm) => !!touched[k] && !!errors[k];
  const help = (k: keyof PodForm) => (touched[k] ? (errors[k] as string) : undefined);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Club"
          name="club_id"
          value={values.club_id}
          onChange={handleChange}
          fullWidth
          required
          error={err('club_id')}
          helperText={help('club_id') || 'Club is the parent — its venues become the cities.'}
        >
          {clubs.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.club_name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="City (Location)"
          name="location_id"
          value={values.location_id}
          onChange={handleChange}
          fullWidth
          required
          disabled={!values.club_id}
          error={err('location_id')}
          helperText={
            help('location_id') ||
            (!values.club_id
              ? 'Pick a club first'
              : filteredLocations.length === 0
                ? 'No venues for this club.'
                : "Loaded from the selected club's venues.")
          }
        >
          {filteredLocations.map((l) => (
            <MenuItem key={l.id} value={l.id}>
              {l.location_name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Zone"
          name="zone_name"
          value={values.zone_name}
          onChange={handleChange}
          fullWidth
          disabled={!values.location_id || zoneOptions.length === 0}
          helperText={
            !values.location_id
              ? 'Pick a city first'
              : zoneOptions.length === 0
                ? 'No zones configured'
                : 'Pod is scoped to this zone'
          }
        >
          <MenuItem value="">— Any zone —</MenuItem>
          {zoneOptions.map((z) => (
            <MenuItem key={z} value={z}>
              {z}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Start date & time"
          type="datetime-local"
          value={values.pod_date_time}
          onChange={(e) => setFieldValue('pod_date_time', e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          required
          error={err('pod_date_time')}
          helperText={help('pod_date_time')}
        />
        <TextField
          label="End date & time"
          type="datetime-local"
          value={values.pod_end_date_time}
          onChange={(e) => setFieldValue('pod_end_date_time', e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          error={err('pod_end_date_time')}
          helperText={help('pod_end_date_time')}
        />
      </Stack>
    </Stack>
  );
}
