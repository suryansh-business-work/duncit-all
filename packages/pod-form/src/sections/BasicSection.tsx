import { MenuItem, Stack, TextField } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import HostSelectField from '../components/HostSelectField';
import HostsField from '../components/HostsField';
import PodModeToggle from '../components/PodModeToggle';
import RhfTextField from '../components/RhfTextField';
import AutoPodEconomicsFields from './AutoPodEconomicsFields';
import { usePodFormData } from '../context';
import type { PodFormValues } from '../types';
import { useTranslation } from '../i18n/useTranslation';

/** The pod's title — the one field every mode starts with. */
function TitleField() {
  const { t } = useTranslation();
  const { control } = useFormContext<PodFormValues>();
  return (
    <RhfTextField
      control={control}
      name="pod_title"
      label={t('podForm.basicSection.podTitle')}
      required
      hint="A URL-friendly slug is auto-generated from this title"
    />
  );
}

/** Free-text hashtags — the last field of the section in every mode. */
function HashtagsField() {
  const { t } = useTranslation();
  const { register } = useFormContext<PodFormValues>();
  return (
    <TextField
      label={t('podForm.basicSection.hashtagsSpaceOrCommaSeparated')}
      fullWidth
      placeholder="#cricket #weekend"
      {...register('pod_hashtag_text')}
    />
  );
}

export default function BasicSection() {
  const { t } = useTranslation();
  const { config, clubs, searchHosts } = usePodFormData();
  const { control, setValue, formState: { errors } } = useFormContext<PodFormValues>();
  const clubId = useWatch({ control, name: 'club_id' });

  // An Auto Pod's author decides the title, the economics and the tags: the
  // club and the hosts are what the partners who enrol bring, and the mode is
  // chosen above the sections by the stepper.
  if (config.autoPod) {
    return (
      <Stack spacing={2}>
        <TitleField />
        <AutoPodEconomicsFields />
        <HashtagsField />
      </Stack>
    );
  }

  const handleClubChange = (value: string) => {
    setValue('club_id', value, { shouldValidate: true });
    setValue('venue_id', '');
    setValue('venue_slot_id', '');
    setValue('location_id', '');
    setValue('zone_name', '');
  };

  return (
    <Stack spacing={2}>
      <TitleField />
      <PodModeToggle />
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
      <HashtagsField />
    </Stack>
  );
}
