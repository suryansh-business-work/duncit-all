import { Controller } from 'react-hook-form';
import {
  Autocomplete,
  Box,
  Card,
  FormHelperText,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import { DuncitButton } from '@duncit/buttons';
import { clubOptionLabel, clubPlaceLabel } from '@duncit/utils';
import LocationDialog from '../../../../components/app-header/LocationDialog';
import VenueMapPreview from '../../../../components/VenueMapPreview';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import ClubPreview from '../ClubPreview';
import ClubOption from './ClubOption';
import { usePodLocationPicker } from '../usePodLocationPicker';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodClub, CreatePodForm, CreatePodLocation } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  clubs: CreatePodClub[];
  locations: CreatePodLocation[];
}

/** 40px round soft disc carrying the accent place glyph (native twin: same disc). */
const ICON_DISC_SX = {
  display: 'grid',
  placeItems: 'center',
  width: 40,
  height: 40,
  flexShrink: 0,
  borderRadius: '50%',
  bgcolor: 'action.hover',
  color: 'secondary.main',
} as const;

/** Step 2 — pod location + locality (chosen in the header-style location picker,
 * which shows the club count per locality), the pod mode and the club. The
 * category moved above the page title, so the club list arrives already scoped
 * to it. */
export default function LocationClubStep({ form, clubs, locations }: Readonly<Props>) {
  const {
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const { t } = useTranslation();
  const locationId = watch('location_id');
  const locality = watch('locality');
  const location = locations.find((item) => item.id === locationId) ?? null;
  const picker = usePodLocationPicker(form);
  const placeOf = (club: CreatePodClub) => clubPlaceLabel(club, locations);

  return (
    <Stack spacing={2}>
      <Card sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box sx={ICON_DISC_SX}>
            <PlaceIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
              {t('mweb.createPod.podLocation')}
            </Typography>
            <Typography variant="subtitle2" noWrap data-testid="create-pod-location-label" sx={{ fontSize: '0.95rem' }}>
              {location ? [location.location_name || location.city, location.state].filter(Boolean).join(', ') : t('mweb.createPod.noLocationSelected')}
            </Typography>
            {locality && (
              <Typography variant="caption" noWrap data-testid="create-pod-locality-label" sx={{
                color: "text.secondary"
              }}>
                {t('mweb.createPod.localityLabel', { vars: { locality } })}
              </Typography>
            )}
          </Box>
          <DuncitButton size="small" variant="outlined" onClick={picker.openPicker} data-testid="create-pod-change-location" sx={{ minHeight: 36 }}>
            {t('mweb.createPod.change')}
          </DuncitButton>
        </Stack>
        {errors.location_id && <FormHelperText error>{errors.location_id.message}</FormHelperText>}
      </Card>

      {location && (
        <VenueMapPreview
          title={location.location_name || location.city || t('mweb.createPod.podLocation')}
          parts={[location.location_name, location.city, location.state, location.country]}
        />
      )}

      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('mweb.createPod.podMode')}</Typography>
        <Controller
          control={control}
          name="pod_mode"
          render={({ field }) => (
            <ToggleButtonGroup
              exclusive
              fullWidth
              aria-label={t('mweb.createPod.podMode')}
              color="primary"
              value={field.value}
              onChange={(_e, next) => {
                if (!next) return;
                field.onChange(next);
                // Physical pods can only be Paid — a Free virtual pod switching
                // to Physical must not carry FREE to submit.
                if (next === 'PHYSICAL' && watch('pod_type') === 'FREE') {
                  setValue('pod_type', 'PAID', { shouldDirty: true, shouldValidate: true });
                  // FREE forced the price to ₹0 — the now-paid pod starts blank.
                  setValue('pod_amount', null, { shouldDirty: true });
                }
              }}
            >
              <ToggleButton value="PHYSICAL" sx={{ py: 1.25, fontWeight: 600 }}><DirectionsRunIcon fontSize="small" sx={{ mr: 1 }} /> {t('mweb.createPod.modePhysical')}</ToggleButton>
              <ToggleButton value="VIRTUAL" sx={{ py: 1.25, fontWeight: 600 }}><VideocamIcon fontSize="small" sx={{ mr: 1 }} /> {t('mweb.createPod.modeVirtual')}</ToggleButton>
            </ToggleButtonGroup>
          )}
        />
      </Card>

      <Card sx={{ p: 2, display: 'grid', gap: 1.5 }}>
        <Controller
          control={control}
          name="club_id"
          render={({ field }) => (
            <Autocomplete
              options={clubs}
              getOptionLabel={(option) => clubOptionLabel(option.club_name, placeOf(option))}
              value={clubs.find((club) => club.id === field.value) ?? null}
              onChange={(_e, next) => field.onChange(next?.id ?? '')}
              isOptionEqualToValue={(option, selected) => option.id === selected.id}
              renderOption={(props, option) => (
                <ClubOption {...props} key={option.id} club={option} place={placeOf(option)} />
              )}
              renderInput={(params) => (
                <TextField {...params} label={requiredLabel(t('mweb.createPod.clubLabel'), true)} error={!!errors.club_id} helperText={errors.club_id?.message} />
              )}
            />
          )}
        />
        <ClubPreview club={clubs.find((club) => club.id === watch('club_id')) ?? null} />
      </Card>

      <LocationDialog {...picker.dialog} locations={locations} />
    </Stack>
  );
}
