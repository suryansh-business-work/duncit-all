import { Grid } from '@mui/material';
import ChecklistIcon from '@mui/icons-material/Checklist';
import { useTranslation } from '@duncit/shell';
import type { Control } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import ChipMultiSelect from '../fields/ChipMultiSelect';
import type { VenueRegistrationConfig } from '../queries';
import type { VenueFormValues } from '../types';
import { sectionAnchor } from './venue-editor-sections';

/**
 * Amenities & Security — what the venue offers its guests, what its premises
 * have, and how it is kept safe. Every option is the registration config's.
 */
export default function AmenitiesSection({
  control,
  config,
}: Readonly<{ control: Control<VenueFormValues>; config: VenueRegistrationConfig }>) {
  const { t } = useTranslation();

  return (
    <SectionCard
      id={sectionAnchor('amenities')}
      icon={<ChecklistIcon color="primary" />}
      title={t('directory.venueEditor.sectionAmenities')}
    >
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <ChipMultiSelect
            control={control}
            name="amenities"
            label={t('directory.venueEditor.amenities')}
            options={config.amenities}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <ChipMultiSelect
            control={control}
            name="facilities"
            label={t('directory.venueEditor.facilities')}
            options={config.facilities}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <ChipMultiSelect
            control={control}
            name="security"
            label={t('directory.venueEditor.security')}
            options={config.security}
          />
        </Grid>
      </Grid>
    </SectionCard>
  );
}
