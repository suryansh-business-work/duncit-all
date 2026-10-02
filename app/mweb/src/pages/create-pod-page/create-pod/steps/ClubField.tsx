import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Autocomplete, TextField } from '@mui/material';
import { clubLacksOpenSlots, clubOptionLabel, clubPlaceLabel } from '@duncit/utils';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { useTranslation } from '../../../../i18n/useTranslation';
import ClubOption from './ClubOption';
import NoSlotsDialog from './NoSlotsDialog';
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
 * locality is picked and says how many clubs that locality holds. A club whose
 * venues have no open slot is not selected for a physical pod: the no-slots
 * dialog opens instead. Native twin: ClubSearchField.
 */
export default function ClubField({ form, clubs, locations, locality, locked }: Readonly<Props>) {
  const { t } = useTranslation();
  const [blockedClub, setBlockedClub] = useState<CreatePodClub | null>(null);
  const podMode = form.watch('pod_mode');
  const placeOf = (club: CreatePodClub) => clubPlaceLabel(club, locations);
  const countHint = locality
    ? t('mweb.createPod.clubsInLocality', { count: clubs.length, vars: { locality } })
    : undefined;
  const hint = locked ? t('mweb.createPod.clubPickLocalityFirst') : countHint;

  return (
    <>
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
            onChange={(_e, next) => {
              if (clubLacksOpenSlots(next, podMode)) {
                setBlockedClub(next);
                return;
              }
              field.onChange(next?.id ?? '');
            }}
            isOptionEqualToValue={(option, selected) => option.id === selected.id}
            noOptionsText={t('mweb.createPod.clubsEmpty')}
            renderOption={(props, option) => (
              <ClubOption
                {...props}
                key={option.id}
                club={option}
                place={placeOf(option)}
                showSlots={podMode === 'PHYSICAL'}
              />
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
      <NoSlotsDialog club={blockedClub} onClose={() => setBlockedClub(null)} />
    </>
  );
}
