import { useCallback, useRef, useState } from 'react';
import { Box, Chip, CircularProgress, FormHelperText, Stack, Typography } from '@mui/material';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAltOutlined';
import PlaceIcon from '@mui/icons-material/Place';
import { DuncitButton } from '@duncit/buttons';
import { clubCityName, placeLabel } from '@duncit/utils';
import LocationDialog from '../../../../components/app-header/LocationDialog';
import { useTranslation } from '../../../../i18n/useTranslation';
import { applyPodLocation } from '../create-pod.location';
import type { CreatePodForm, CreatePodLocation } from '../create-pod.types';
import { usePodLocationPicker } from '../usePodLocationPicker';
import { CHOICE_CHIP_SX } from './HostCategoryField';
import { useDeviceLocality } from './useDeviceLocality';

interface Props {
  form: CreatePodForm;
  locations: CreatePodLocation[];
}

/**
 * Step 1 — the locality, under the category. It opens on the area this device
 * is in, highlighted like a picked category because a pod has exactly one, and
 * "Edit location" opens the same picker step 2's Change does. The area is what
 * scopes the clubs step 2 offers. Native twin (rule 27).
 */
export default function LocalityField({ form, locations }: Readonly<Props>) {
  const { t } = useTranslation();
  const locationId = form.watch('location_id');
  const locality = form.watch('locality');
  const location = locations.find((item) => item.id === locationId) ?? null;
  // A resumed draft already has its area; only a fresh pod asks the device.
  const [lookUpDevice] = useState(() => !form.getValues('locality'));
  // A pick made while the device lookup is still out wins over its answer.
  const picked = useRef(false);
  const onFound = useCallback(
    (id: string, zone: string) => {
      if (!picked.current) applyPodLocation(form, id, zone);
    },
    [form],
  );
  const device = useDeviceLocality(locations, lookUpDevice, onFound);
  const picker = usePodLocationPicker(form, () => {
    picked.current = true;
  });

  const label = location ? placeLabel(locality, clubCityName(location)) : t('mweb.createPod.noLocationSelected');
  const chipIcon = device.detecting ? <CircularProgress size={14} color="inherit" /> : <PlaceIcon />;

  return (
    <Box data-testid="create-pod-locality">
      <Typography variant="subtitle2" component="h3">
        {t('mweb.createPod.localityHeading')}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
        {t('mweb.createPod.localityHint')}
      </Typography>
      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        <Chip
          icon={chipIcon}
          label={device.detecting ? t('mweb.createPod.localityDetecting') : label}
          color="primary"
          variant="filled"
          aria-live="polite"
          data-testid="create-pod-locality-selected"
          sx={CHOICE_CHIP_SX}
        />
        <DuncitButton
          size="small"
          variant="text"
          startIcon={<EditLocationAltIcon />}
          onClick={picker.openPicker}
          data-testid="create-pod-edit-location"
          sx={{ minHeight: 36 }}
        >
          {t('mweb.createPod.editLocation')}
        </DuncitButton>
      </Stack>
      {device.failed && (
        <FormHelperText data-testid="create-pod-locality-detect-failed" role="status">
          {t('mweb.createPod.localityDetectFailed')}
        </FormHelperText>
      )}
      <LocationDialog {...picker.dialog} locations={locations} />
    </Box>
  );
}
