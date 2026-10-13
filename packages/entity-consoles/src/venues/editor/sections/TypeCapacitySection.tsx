import { useEffect } from 'react';
import { Grid, MenuItem, Stack } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import CapacityItemsField from '../fields/CapacityItemsField';
import { capacityTotal } from '../mappers';
import type { VenueRegistrationConfig } from '../queries';
import type { VenueFormValues } from '../types';
import { sectionAnchor } from './venue-editor-sections';

/**
 * Type & Capacity — what kind of place it is, and what it seats.
 *
 * ONE capacity truth, as on the owner's form: once the venue has named spaces,
 * the total is their sum — the server derives exactly that on save — so the
 * total is shown read-only and kept in step with the rows instead of being a
 * second number the two could disagree on. Only a venue with no named spaces
 * (which staff may still register, from partial information) has a total that
 * is typed in.
 */
export default function TypeCapacitySection({
  control,
  setValue,
  config,
}: Readonly<{
  control: Control<VenueFormValues>;
  setValue: UseFormSetValue<VenueFormValues>;
  config: VenueRegistrationConfig;
}>) {
  const { t } = useTranslation();
  const spaces = useWatch({ control, name: 'capacity_items' });
  const derived = spaces.length > 0;
  const total = capacityTotal(spaces);

  useEffect(() => {
    if (derived) setValue('capacity', total, { shouldDirty: true, shouldValidate: true });
  }, [derived, total, setValue]);

  return (
    <SectionCard
      id={sectionAnchor('type-capacity')}
      icon={<CategoryIcon color="primary" />}
      title={t('directory.venueEditor.sectionTypeCapacity')}
    >
      <Stack spacing={1.5}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
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
          <Grid size={{ xs: 12, md: 6 }}>
            <RhfTextField
              control={control}
              name="capacity"
              label={t('directory.venueEditor.totalCapacity')}
              size="small"
              type="number"
              required={!derived}
              hint={derived ? t('directory.venueEditor.capacityDerivedHint') : undefined}
              slotProps={{ htmlInput: { readOnly: derived } }}
            />
          </Grid>
        </Grid>

        <CapacityItemsField control={control} limit={config.capacity_item_limit} />
      </Stack>
    </SectionCard>
  );
}
