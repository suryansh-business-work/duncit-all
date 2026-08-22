import { Stack } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormField } from '@duncit/forms';
import SelectField from '../../fields/SelectField';
import MultiSelectField from '../../fields/MultiSelectField';
import FieldGrid from '../../fields/FieldGrid';
import SuperCategoryField from '../../fields/SuperCategoryField';
import CategorySelectors from '../../fields/CategorySelectors';
import type { CrmOptionGroup } from '../../../api/crm.types';
import { useTranslation } from '@duncit/shell';

export default function VenueDetailsSection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const venueTypes = (useWatch({ control, name: 'venue_types' }) as string[]) ?? [];
  const showOther = venueTypes.includes('Other');
  return (
    <Stack spacing={1.5}>
      <SuperCategoryField
        name="super_category_id"
        label={t('crm.common.superCategory')}
        required
        hint="Which super category is this venue being added under? Managed via admin."
      />
      <CategorySelectors />
      <FieldGrid>
        <FormField name="venue_name" label={t('crm.forms.venueName')} required size="small" />
        <SelectField name="space_type" label={t('crm.forms.indoorOutdoorBoth')} options={config.space_types} />
      </FieldGrid>
      <MultiSelectField name="venue_types" label={t('crm.forms.venueType')} options={config.venue_types} required />
      {showOther && (
        <FormField
          name="venue_type_other"
          label={t('crm.forms.otherVenueTypePleaseSpecify')}
          required
          size="small"
          hint="You selected Other; describe the venue type."
        />
      )}
      <FormField name="venue_description" label={t('crm.forms.venueDescription')} size="small" multiline minRows={2} />
      <FieldGrid>
        <FormField name="capacity_min" label={t('crm.forms.capacityMin')} size="small" inputProps={{ inputMode: 'numeric' }} />
        <FormField name="capacity_max" label={t('crm.forms.capacityMax')} size="small" inputProps={{ inputMode: 'numeric' }} />
      </FieldGrid>
    </Stack>
  );
}
