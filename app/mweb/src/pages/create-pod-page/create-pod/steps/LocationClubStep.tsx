import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Autocomplete, Box, Card, FormHelperText, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import { DuncitButton } from '@duncit/buttons';
import LocationDialog from '../../../../components/app-header/LocationDialog';
import VenueMapPreview from '../../../../components/VenueMapPreview';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import ClubPreview from '../ClubPreview';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodClub, CreatePodForm, CreatePodLocation } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  clubs: CreatePodClub[];
  locations: CreatePodLocation[];
}

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftLocationId, setDraftLocationId] = useState('');
  const [draftZone, setDraftZone] = useState('');

  const openPicker = () => {
    setDraftLocationId(locationId);
    setDraftZone(locality);
    setPickerOpen(true);
  };
  const applyLocation = (nextId: string, zone: string) => {
    if (nextId) {
      if (nextId !== locationId) {
        // Venue + slot belong to the old city — reselect them for the new one.
        setValue('location_id', nextId, { shouldDirty: true, shouldValidate: true });
        setValue('venue_id', '', { shouldDirty: true });
        setValue('venue_slot_id', '', { shouldDirty: true });
      }
      // The picked locality narrows the clubs; changing city resets it too.
      setValue('locality', zone ?? '', { shouldDirty: true, shouldValidate: true });
    }
    setPickerOpen(false);
  };

  return (
    <Stack spacing={2}>
      <Card variant="outlined" sx={{ p: 1.5, borderRadius: '16px' }}>
        <Stack direction="row" spacing={1.25} sx={{
          alignItems: "center"
        }}>
          <PlaceIcon color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600
              }}>{t('mweb.createPod.podLocation')}</Typography>
            <Typography variant="subtitle2" noWrap data-testid="create-pod-location-label" sx={{
              fontWeight: 700
            }}>
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
          <DuncitButton size="small" variant="outlined" startIcon={<EditLocationAltIcon />} onClick={openPicker} data-testid="create-pod-change-location">
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

      <Box>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 600,
            display: 'block',
            mb: 0.75
          }}>{t('mweb.createPod.podMode')}</Typography>
        <Controller
          control={control}
          name="pod_mode"
          render={({ field }) => (
            <ToggleButtonGroup
              exclusive
              fullWidth
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
      </Box>

      <Controller
        control={control}
        name="club_id"
        render={({ field }) => (
          <Autocomplete
            options={clubs}
            getOptionLabel={(option) => option.club_name}
            value={clubs.find((club) => club.id === field.value) ?? null}
            onChange={(_e, next) => field.onChange(next?.id ?? '')}
            isOptionEqualToValue={(option, selected) => option.id === selected.id}
            renderInput={(params) => (
              <TextField {...params} label={requiredLabel(t('mweb.createPod.clubLabel'), true)} error={!!errors.club_id} helperText={errors.club_id?.message ?? t('mweb.createPod.clubHint')} />
            )}
          />
        )}
      />
      <ClubPreview club={clubs.find((club) => club.id === watch('club_id')) ?? null} />

      <LocationDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        locations={locations}
        draftLocationId={draftLocationId}
        setDraftLocationId={setDraftLocationId}
        draftZone={draftZone}
        setDraftZone={setDraftZone}
        onApply={() => applyLocation(draftLocationId, draftZone)}
        onAutoApply={(nextId, zoneName) => applyLocation(nextId, zoneName)}
      />
    </Stack>
  );
}
