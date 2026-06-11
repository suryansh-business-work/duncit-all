import { useFormikContext } from 'formik';
import { MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import type { PodForm } from '../queries';

interface Props {
  clubs: any[];
  users: any[];
  userName: (id: string) => string;
}

export default function BasicInfoSection({ clubs, users, userName }: Readonly<Props>) {
  const { values, errors, touched, handleChange, setFieldValue } = useFormikContext<PodForm>();
  const err = (k: keyof PodForm) => !!touched[k] && !!errors[k];
  const help = (k: keyof PodForm) => (touched[k] ? (errors[k] as string) : undefined);

  return (
    <Stack spacing={2}>
      <TextField
        label="Pod title"
        name="pod_title"
        value={values.pod_title}
        onChange={handleChange}
        fullWidth
        required
        error={err('pod_title')}
        helperText={
          help('pod_title') ??
          (values.id
            ? `URL slug: ${values.pod_id || '—'}`
            : 'A URL-friendly slug is auto-generated from this title')
        }
      />
      <ToggleButtonGroup
        exclusive
        fullWidth
        color="primary"
        value={values.pod_mode}
        onChange={(_, nextMode) => {
          if (nextMode) setFieldValue('pod_mode', nextMode);
        }}
        aria-label="Pod mode"
      >
        <ToggleButton value="PHYSICAL" aria-label="Physical pod">
          <PlaceIcon fontSize="small" sx={{ mr: 1 }} /> Physical
        </ToggleButton>
        <ToggleButton value="VIRTUAL" aria-label="Virtual pod">
          <VideocamIcon fontSize="small" sx={{ mr: 1 }} /> Virtual
        </ToggleButton>
      </ToggleButtonGroup>
      <TextField
        select
        label="Club"
        name="club_id"
        value={values.club_id}
        onChange={(event) => {
          setFieldValue('club_id', event.target.value);
          setFieldValue('venue_id', '');
          setFieldValue('location_id', '');
          setFieldValue('zone_name', '');
        }}
        fullWidth
        required
        error={err('club_id')}
        helperText={help('club_id')}
      >
        {clubs.map((club) => (
          <MenuItem key={club.id} value={club.id}>
            {club.club_name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Hosts"
        value={values.pod_hosts_id}
        onChange={(e) => {
          const v = e.target.value as unknown as string[] | string;
          setFieldValue('pod_hosts_id', typeof v === 'string' ? v.split(',') : v);
        }}
        SelectProps={{
          multiple: true,
          renderValue: (sel: any) => (sel as string[]).map(userName).join(', '),
        }}
        fullWidth
        required
        error={err('pod_hosts_id')}
        helperText={help('pod_hosts_id')}
      >
        {users.map((u) => (
          <MenuItem key={u.user_id} value={u.user_id}>
            {u.full_name || u.email}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Hashtags (space or comma separated)"
        name="pod_hashtag_text"
        value={values.pod_hashtag_text}
        onChange={handleChange}
        fullWidth
        placeholder="#cricket #weekend"
      />
    </Stack>
  );
}
