import { Grid, Stack } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import { RhfTextField } from '@duncit/forms';
import { RhfAdminLocation } from '@duncit/location';
import { useTranslation } from '@duncit/shell';
import type { Control } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import type { VenueFormValues } from '../types';

/**
 * Where the venue is.
 *
 * The city comes strictly from the admin Location list rather than free text:
 * a club auto-matches its venues by `location_id`, so a hand-typed city name
 * would put a real venue outside every club that should have found it.
 */
export default function LocationSection({
  control,
}: Readonly<{ control: Control<VenueFormValues> }>) {
  const { t } = useTranslation();

  return (
    <SectionCard icon={<PlaceIcon color="primary" />} title={t('directory.venueEditor.location')}>
      <Stack spacing={1.5}>
        <RhfAdminLocation
          control={control}
          name="location"
          required
          direction="row"
          legend={t('directory.venueEditor.cityAndArea')}
          hint={t('directory.venueEditor.locationHint')}
        />
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <RhfTextField
              control={control}
              name="address_line1"
              label={t('directory.venueEditor.addressLine1')}
              size="small"
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <RhfTextField
              control={control}
              name="address_line2"
              label={t('directory.venueEditor.addressLine2')}
              size="small"
            />
          </Grid>
        </Grid>
      </Stack>
    </SectionCard>
  );
}
