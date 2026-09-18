import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
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
 * of this host's clubs in it. Picking one is what opens the club picker below,
 * and a new pick clears the club chosen for the old area. Native twin (rule 27).
 */
export default function LocalityField({ form, zones, cityClubs, cityName }: Readonly<Props>) {
  const { t } = useTranslation();
  const locality = form.watch('locality');
  const selected = zones.find((zone) => zone.zone_name === locality) ?? null;
  const clubCount = (zone: CreatePodLocationZone) =>
    cityClubs.filter((club) => (club.locality ?? '') === zone.zone_name).length;

  return (
    <Autocomplete
      data-testid="create-pod-locality"
      options={zones}
      value={selected}
      getOptionLabel={(zone) => zone.zone_name}
      isOptionEqualToValue={(option, value) => option.zone_name === value.zone_name}
      onChange={(_e, next) => applyPodLocation(form, form.getValues('location_id'), next?.zone_name ?? '')}
      noOptionsText={t('mweb.createPod.localitiesEmpty')}
      renderOption={(props, zone) => (
        <Box
          component="li"
          {...props}
          key={zone.zone_name}
          data-testid={`create-pod-locality-option-${zone.zone_name}`}
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <PlaceIcon fontSize="small" aria-hidden sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
            {zone.zone_name}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
            {t('mweb.clubsPage.clubCount', { count: clubCount(zone) })}
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
