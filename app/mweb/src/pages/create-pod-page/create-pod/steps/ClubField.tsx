import { Controller } from 'react-hook-form';
import { Autocomplete, TextField } from '@mui/material';
import { clubOptionLabel, clubPlaceLabel } from '@duncit/utils';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { useTranslation } from '../../../../i18n/useTranslation';
import ClubOption from './ClubOption';
import type { CreatePodClub, CreatePodForm, CreatePodLocation } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  clubs: CreatePodClub[];
  locations: CreatePodLocation[];
  /** The picked locality, or '' — until one is picked the club list is locked. */
  locality: string;
  locked: boolean;
}

/**
 * The club this pod belongs to, searchable by name or place. It opens once a
 * locality is picked and says how many clubs that locality holds. Native twin:
 * ClubSearchField.
 */
export default function ClubField({ form, clubs, locations, locality, locked }: Readonly<Props>) {
  const { t } = useTranslation();
  const placeOf = (club: CreatePodClub) => clubPlaceLabel(club, locations);
  const countHint = locality
    ? t('mweb.createPod.clubsInLocality', { count: clubs.length, vars: { locality } })
    : undefined;
  const hint = locked ? t('mweb.createPod.clubPickLocalityFirst') : countHint;

  return (
    <Controller
      control={form.control}
      name="club_id"
      render={({ field, fieldState }) => (
        <Autocomplete
          data-testid="create-pod-club"
          options={clubs}
          disabled={locked}
          getOptionLabel={(option) => clubOptionLabel(option.club_name, placeOf(option))}
          value={clubs.find((club) => club.id === field.value) ?? null}
          onChange={(_e, next) => field.onChange(next?.id ?? '')}
          isOptionEqualToValue={(option, selected) => option.id === selected.id}
          noOptionsText={t('mweb.createPod.clubsEmpty')}
          renderOption={(props, option) => (
            <ClubOption {...props} key={option.id} club={option} place={placeOf(option)} />
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label={requiredLabel(t('mweb.createPod.clubLabel'), true)}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? hint}
            />
          )}
        />
      )}
    />
  );
}
