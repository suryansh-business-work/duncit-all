import { useFormContext, useWatch } from 'react-hook-form';
import { MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import RhfTextField from '../../../forms/components/RhfTextField';
import type { PodForm } from '../queries';

interface Props {
  clubs: any[];
  users: any[];
  userName: (id: string) => string;
}

export default function BasicInfoSection({ clubs, users, userName }: Readonly<Props>) {
  const { control, register, getValues, setValue, formState: { errors } } = useFormContext<PodForm>();
  const podMode = useWatch({ control, name: 'pod_mode' });
  const clubId = useWatch({ control, name: 'club_id' });
  const hosts = useWatch({ control, name: 'pod_hosts_id' });
  const id = getValues('id');
  const podId = getValues('pod_id');
  const titleHint = id
    ? `URL slug: ${podId || '—'}`
    : 'A URL-friendly slug is auto-generated from this title';

  return (
    <Stack spacing={2}>
      <RhfTextField control={control} name="pod_title" label="Pod title" required hint={titleHint} />
      <ToggleButtonGroup
        exclusive
        fullWidth
        color="primary"
        value={podMode}
        onChange={(_, nextMode) => {
          if (nextMode) setValue('pod_mode', nextMode);
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
        value={clubId}
        onChange={(event) => {
          setValue('club_id', event.target.value, { shouldValidate: true });
          setValue('venue_id', '');
          setValue('location_id', '');
          setValue('zone_name', '');
        }}
        fullWidth
        required
        error={!!errors.club_id}
        helperText={errors.club_id?.message}
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
        value={hosts}
        onChange={(event) => {
          const v = event.target.value as unknown as string[] | string;
          setValue('pod_hosts_id', typeof v === 'string' ? v.split(',') : v, { shouldValidate: true });
        }}
        SelectProps={{
          multiple: true,
          renderValue: (sel: any) => (sel as string[]).map(userName).join(', '),
        }}
        fullWidth
        required
        error={!!errors.pod_hosts_id}
        helperText={errors.pod_hosts_id?.message}
      >
        {users.map((u) => (
          <MenuItem key={u.user_id} value={u.user_id}>
            {u.full_name || u.email}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Hashtags (space or comma separated)"
        fullWidth
        placeholder="#cricket #weekend"
        {...register('pod_hashtag_text')}
      />
    </Stack>
  );
}
