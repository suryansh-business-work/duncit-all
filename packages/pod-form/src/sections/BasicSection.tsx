import { MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import { useFormContext, useWatch } from 'react-hook-form';
import HostSelectField from '../components/HostSelectField';
import HostsField from '../components/HostsField';
import RhfTextField from '../components/RhfTextField';
import { usePodFormData } from '../context';
import type { PodFormValues } from '../types';
import { useTranslation } from '../i18n/useTranslation';

export default function BasicSection() {
  const { t } = useTranslation();
  const { config, clubs, searchHosts } = usePodFormData();
  const { control, register, setValue, formState: { errors } } = useFormContext<PodFormValues>();
  const podMode = useWatch({ control, name: 'pod_mode' });
  const clubId = useWatch({ control, name: 'club_id' });

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
        label={t('podForm.basicSection.podTitle')}
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
        aria-label={t('podForm.basicSection.podMode')}
      >
        <ToggleButton value="PHYSICAL" aria-label={t('podForm.basicSection.physicalPod')}>
          <PlaceIcon fontSize="small" sx={{ mr: 1 }} /> Physical
        </ToggleButton>
        <ToggleButton value="VIRTUAL" aria-label={t('podForm.basicSection.virtualPod')}>
          <VideocamIcon fontSize="small" sx={{ mr: 1 }} /> Virtual
        </ToggleButton>
      </ToggleButtonGroup>
      <TextField
        select
        label={t('podForm.basicSection.club')}
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
      {config.showHosts && !searchHosts && <HostSelectField />}
      <TextField
        label={t('podForm.basicSection.hashtagsSpaceOrCommaSeparated')}
        fullWidth
        placeholder="#cricket #weekend"
        {...register('pod_hashtag_text')}
      />
    </Stack>
  );
}
