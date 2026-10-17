import { useState } from 'react';
import { Autocomplete, Box, Stack, TextField, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import { localitiesByClubCount } from '@duncit/utils';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { useTranslation } from '../../../../i18n/useTranslation';
import { applyPodLocation } from '../create-pod.location';
import type {
  CreatePodClub,
  CreatePodForm,
  CreatePodLocation,
  CreatePodLocationZone,
} from '../create-pod.types';
import EditPodLocation from './EditPodLocation';

interface Props {
  form: CreatePodForm;
  /** The areas of the pod's city — the city is the header's selected location. */
  zones: CreatePodLocationZone[];
  /** The clubs this host may pick in that city, before an area narrows them. */
  cityClubs: CreatePodClub[];
  cityName: string;
  /** Every city — what "Edit location" offers to move the pod to. */
  locations: CreatePodLocation[];
}

/**
 * Step 1 — a searchable dropdown of the city's localities, each with the number
 * of this host's clubs in it. Localities with clubs come first; the empty ones
 * sit at the bottom, disabled. Picking one is what opens the club picker below,
 * and a new pick clears the club chosen for the old area. "Edit location"
 * beside it moves the pod to another city. A move that clears the club, venue
 * or slot says so under the field. Native twin (rule 27).
 */
export default function LocalityField({
  form,
  zones,
  cityClubs,
  cityName,
  locations,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const locality = form.watch('locality');
  const [picksCleared, setPicksCleared] = useState(false);
  const options = localitiesByClubCount(
    zones.map((zone) => zone.zone_name),
    cityClubs,
  );
  const selected = options.find((option) => option.locality === locality) ?? null;

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 0 }}>
          {t('mweb.createPod.localityCityHint', { vars: { city: cityName } })}
        </Typography>
        <EditPodLocation form={form} locations={locations} onMoved={setPicksCleared} />
      </Stack>
      <Autocomplete
        data-testid="create-pod-locality"
        options={options}
        value={selected}
        getOptionLabel={(option) => option.locality}
        getOptionDisabled={(option) => option.count === 0}
        isOptionEqualToValue={(option, value) => option.locality === value.locality}
        onChange={(_e, next) =>
          setPicksCleared(applyPodLocation(form, form.getValues('location_id'), next?.locality ?? ''))
        }
        noOptionsText={t('mweb.createPod.localitiesEmpty')}
        renderOption={(props, option) => (
          <Box
            component="li"
            {...props}
            key={option.locality}
            data-testid={`create-pod-locality-option-${option.locality}`}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <PlaceIcon fontSize="small" aria-hidden sx={{ color: 'text.secondary' }} />
            <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
              {option.locality}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
              {t('mweb.clubsPage.clubCount', { count: option.count })}
            </Typography>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label={requiredLabel(t('mweb.createPod.localityHeading'), true)}
            placeholder={t('mweb.createPod.localityPlaceholder')}
          />
        )}
      />
      {picksCleared && (
        <Typography role="status" variant="caption" data-testid="create-pod-location-reset" sx={{ color: 'warning.main' }}>
          {t('mweb.createPod.locationResetNotice')}
        </Typography>
      )}
    </Stack>
  );
}
