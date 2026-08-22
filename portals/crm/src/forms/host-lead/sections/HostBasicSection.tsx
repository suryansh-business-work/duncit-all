import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import SelectField from '../../fields/SelectField';
import FieldGrid from '../../fields/FieldGrid';
import SuperCategoryField from '../../fields/SuperCategoryField';
import CategorySelectors from '../../fields/CategorySelectors';
import { LocationFieldset } from '../../fields/LocationField';
import type { CrmOptionGroup } from '../../../api/crm.types';
import { useTranslation } from '@duncit/shell';

export default function HostBasicSection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <SuperCategoryField
        name="super_category_id"
        label={t('crm.common.superCategory')}
        required
        hint="Which super category is this host being added under? Managed via admin."
      />
      <CategorySelectors />
      <FieldGrid>
        <FormField name="host_name" label={t('crm.forms.hostName')} required size="small" />
        <SelectField name="host_type" label={t('crm.forms.hostType')} options={config.host_types} />
      </FieldGrid>
      <FormField name="organization_name" label={t('crm.forms.organizationCommunityName')} size="small" />
      <LocationFieldset />
    </Stack>
  );
}
