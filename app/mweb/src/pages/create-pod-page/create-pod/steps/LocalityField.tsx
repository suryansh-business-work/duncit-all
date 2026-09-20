import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import { localitiesByClubCount } from '@duncit/utils';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { useTranslation } from '../../../../i18n/useTranslation';
import { applyPodLocation } from '../create-pod.location';
import type { CreatePodClub, CreatePodForm, CreatePodLocationZone } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  /** The areas of the pod's city — the city is the header's selected location. */
  zones: CreatePodLocationZone[];
  /** The clubs this host may pick in that city, before an area narrows them. */
  cityClubs: CreatePodClub[];
  cityName: string;
}

/**
 * Step 1 — a searchable dropdown of the city's localities, each with the number
 * of this host's clubs in it. Localities with clubs come first; the empty ones
 * sit at the bottom, disabled. Picking one is what opens the club picker below,
 * and a new pick clears the club chosen for the old area. Native twin (rule 27).
 */
export default function LocalityField({ form, zones, cityClubs, cityName }: Readonly<Props>) {
  const { t } = useTranslation();
  const locality = form.watch('locality');
  const options = localitiesByClubCount(
    zones.map((zone) => zone.zone_name),
    cityClubs,
  );
  const selected = options.find((option) => option.locality === locality) ?? null;

  return (
    <Autocomplete
      data-testid="create-pod-locality"
      options={options}
      value={selected}
      getOptionLabel={(option) => option.locality}
      getOptionDisabled={(option) => option.count === 0}
      isOptionEqualToValue={(option, value) => option.locality === value.locality}
      onChange={(_e, next) => applyPodLocation(form, form.getValues('location_id'), next?.locality ?? '')}
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
          helperText={t('mweb.createPod.localityCityHint', { vars: { city: cityName } })}
        />
      )}
    />
  );
}
