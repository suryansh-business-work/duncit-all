import { Controller } from 'react-hook-form';
import { Box, Card, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import { clubCityName } from '@duncit/utils';
import { SURFACE_SX } from '../../../../theme';
import ClubPreview from '../ClubPreview';
import ClubField from './ClubField';
import HostCategoryField from './HostCategoryField';
import LocalityField from './LocalityField';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodClub, CreatePodForm, CreatePodHostCategory, CreatePodLocation } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  hostCategories: CreatePodHostCategory[];
  /** Clubs scoped to the category, the city and the picked locality. */
  clubs: CreatePodClub[];
  /** The same clubs before the locality narrows them — the per-locality counts. */
  cityClubs: CreatePodClub[];
  locations: CreatePodLocation[];
}

/** Step 1 — category, pod mode, then the locality (a searchable dropdown of the
 * city the header has selected) and the club, which opens once a locality is
 * picked. Together they decide which club, venues and products the pod gets. */
export default function LocationClubStep({ form, hostCategories, clubs, cityClubs, locations }: Readonly<Props>) {
  const { control, setValue, watch } = form;
  const { t } = useTranslation();
  const location = locations.find((item) => item.id === watch('location_id')) ?? null;
  const zones = location?.location_zones ?? [];
  const physical = watch('pod_mode') === 'PHYSICAL';
  // A virtual pod has no area; a city with no localities offers all its clubs.
  const pickLocality = physical && zones.length > 0;
  const locality = pickLocality ? watch('locality') : '';

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {/* First field: the category scopes the clubs here AND the products on
          step 4. Native twin (rule 27). */}
      <Box data-tour="create-pod-club" sx={{ ...SURFACE_SX, p: 2 }}>
        <HostCategoryField form={form} hostCategories={hostCategories} />
      </Box>

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
                // The club list depends on the mode, so the old pick may not be in it.
                setValue('club_id', '', { shouldDirty: true });
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

      <Card sx={{ p: 2, display: 'grid', gap: 2 }}>
        {pickLocality && location && (
          <LocalityField form={form} zones={zones} cityClubs={cityClubs} cityName={clubCityName(location)} />
        )}
        <ClubField
          form={form}
          clubs={clubs}
          locations={locations}
          locality={locality}
          locked={pickLocality && !locality}
        />
        <ClubPreview club={clubs.find((club) => club.id === watch('club_id')) ?? null} />
      </Card>
    </Box>
  );
}
