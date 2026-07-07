import { useState } from 'react';
import { Controller } from 'react-hook-form';
import {
  Autocomplete, Box, Button, Card, FormHelperText, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import LocationDialog from '../../../../components/app-header/LocationDialog';
import VenueMapPreview from '../../../../components/VenueMapPreview';
import ClubPreview from '../ClubPreview';
import HostCategoryField from './HostCategoryField';
import type { CreatePodClub, CreatePodForm, CreatePodHostCategory, CreatePodLocation } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  clubs: CreatePodClub[];
  locations: CreatePodLocation[];
  hostCategories: CreatePodHostCategory[];
}

/** Step 2 — pod location + locality (chosen in the header-style location picker,
 * which shows the club count per locality), the host category, the pod mode and
 * the club. */
export default function LocationClubStep({ form, clubs, locations, hostCategories }: Readonly<Props>) {
  const {
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;
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
      <Card variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <PlaceIcon color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>Pod location</Typography>
            <Typography variant="subtitle2" fontWeight={900} noWrap data-testid="create-pod-location-label">
              {location ? [location.location_name || location.city, location.state].filter(Boolean).join(', ') : 'No location selected'}
            </Typography>
            {locality && (
              <Typography variant="caption" color="text.secondary" noWrap data-testid="create-pod-locality-label">
                Locality: {locality}
              </Typography>
            )}
          </Box>
          <Button size="small" variant="outlined" startIcon={<EditLocationAltIcon />} onClick={openPicker} data-testid="create-pod-change-location">
            Change
          </Button>
        </Stack>
        {errors.location_id && <FormHelperText error>{errors.location_id.message}</FormHelperText>}
      </Card>

      {location && (
        <VenueMapPreview
          title={location.location_name || location.city || 'Pod location'}
          parts={[location.location_name, location.city, location.state, location.country]}
        />
      )}

      <HostCategoryField form={form} hostCategories={hostCategories} />

      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: 'block', mb: 0.75 }}>Pod mode</Typography>
        <Controller
          control={control}
          name="pod_mode"
          render={({ field }) => (
            <ToggleButtonGroup exclusive fullWidth color="primary" value={field.value} onChange={(_e, next) => next && field.onChange(next)}>
              <ToggleButton value="PHYSICAL" sx={{ py: 1.25, fontWeight: 800 }}><DirectionsRunIcon fontSize="small" sx={{ mr: 1 }} /> Physical</ToggleButton>
              <ToggleButton value="VIRTUAL" sx={{ py: 1.25, fontWeight: 800 }}><VideocamIcon fontSize="small" sx={{ mr: 1 }} /> Virtual</ToggleButton>
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
              <TextField {...params} label="Club" required error={!!errors.club_id} helperText={errors.club_id?.message ?? 'Search and select the club this pod belongs to'} />
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
