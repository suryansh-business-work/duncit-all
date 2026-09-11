import { Grid, MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { RhfAdminCategory } from '@duncit/category';
import { useTranslation } from '@duncit/shell';
import type { Control } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ChipMultiSelect from '../fields/ChipMultiSelect';
import CapacityItemsField from '../fields/CapacityItemsField';
import type { VenueRegistrationConfig } from '../queries';
import type { VenueFormValues } from '../types';

/** What the space is: its name, kind, category, size and what it offers. */
export default function BasicsSection({
  control,
  config,
}: Readonly<{ control: Control<VenueFormValues>; config: VenueRegistrationConfig }>) {
  const { t } = useTranslation();

  return (
    <SectionCard icon={<StorefrontIcon color="primary" />} title={t('directory.venueEditor.basics')}>
      <Stack spacing={1.5}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <RhfTextField
              control={control}
              name="venue_name"
              label={t('directory.venueEditor.venueName')}
              size="small"
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <RhfTextField
              control={control}
              name="venue_type"
              label={t('directory.venueEditor.venueType')}
              size="small"
              select
              required
            >
              {config.venue_types.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </RhfTextField>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <RhfTextField
              control={control}
              name="capacity"
              label={t('directory.venueEditor.totalCapacity')}
              size="small"
              type="number"
              required
            />
          </Grid>
        </Grid>

        <RhfAdminCategory
          control={control}
          name="category"
          legend={t('directory.venueEditor.category')}
          hint={t('directory.venueEditor.categoryHint')}
        />

        <RhfTextField
          control={control}
          name="description"
          label={t('directory.venueEditor.description')}
          size="small"
          multiline
          minRows={3}
        />

        <CapacityItemsField control={control} limit={config.capacity_item_limit} />

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

        <ChipMultiSelect
          control={control}
          name="tags"
          label={t('directory.venueEditor.tags')}
          options={[]}
          freeSolo
          hint={t('directory.venueEditor.tagsHint')}
        />
      </Stack>
    </SectionCard>
  );
}
