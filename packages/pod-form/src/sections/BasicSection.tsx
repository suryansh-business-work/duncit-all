import { MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import { useFormContext, useWatch } from 'react-hook-form';
import HostsField from '../components/HostsField';
import RhfTextField from '../components/RhfTextField';
import { usePodFormData } from '../context';
import type { PodFormValues } from '../types';

export default function BasicSection() {
  const { config, clubs, users, searchHosts } = usePodFormData();
  const { control, register, setValue, formState: { errors } } = useFormContext<PodFormValues>();
  const podMode = useWatch({ control, name: 'pod_mode' });
  const clubId = useWatch({ control, name: 'club_id' });
  const hosts = useWatch({ control, name: 'pod_hosts_id' });

  const userName = (id: string) => {
    const user = users.find((u) => u.user_id === id);
    return user?.full_name || user?.email || id.slice(0, 6);
  };

  const handleClubChange = (value: string) => {
    setValue('club_id', value, { shouldValidate: true });
    setValue('venue_id', '');
    setValue('venue_slot_id', '');
    setValue('location_id', '');
    setValue('zone_name', '');
  };

  return (
    <Stack spacing={2}>
      <RhfTextField
        control={control}
        name="pod_title"
        label="Pod title"
        required
        hint="A URL-friendly slug is auto-generated from this title"
      />
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
        onChange={(event) => handleClubChange(event.target.value)}
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
      {config.showHosts && searchHosts && <HostsField />}
      {config.showHosts && !searchHosts && (
        <TextField
          select
          label="Hosts"
          value={hosts}
          onChange={(event) => {
            const v = event.target.value as unknown as string[] | string;
            /* v8 ignore next -- defensive: the MUI multi-select always yields a string[] */
            setValue('pod_hosts_id', typeof v === 'string' ? v.split(',') : v, { shouldValidate: true });
          }}
          SelectProps={{
            multiple: true,
            renderValue: (sel: unknown) => (sel as string[]).map(userName).join(', '),
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
      )}
      <TextField
        label="Hashtags (space or comma separated)"
        fullWidth
        placeholder="#cricket #weekend"
        {...register('pod_hashtag_text')}
      />
    </Stack>
  );
}
