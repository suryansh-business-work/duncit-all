import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import FieldGrid from '../../fields/FieldGrid';
import SuperCategoryField from '../../fields/SuperCategoryField';
import CategorySelectors from '../../fields/CategorySelectors';
import { LocationFieldset } from '../../fields/LocationField';
import { useTranslation } from '@duncit/shell';

export default function EcommBasicSection() {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <SuperCategoryField
        name="super_category_id"
        label={t('crm.common.superCategory')}
        required
        hint="Which super category is this seller being added under? Managed via admin."
      />
      <CategorySelectors />
      <FieldGrid>
        <FormField name="seller_name" label={t('crm.forms.sellerName')} required size="small" />
        <FormField name="brand_name" label={t('crm.forms.brandName')} size="small" />
      </FieldGrid>
      <FormField name="business_type" label={t('crm.forms.businessType')} size="small" hint="e.g. Manufacturer, Reseller, D2C brand." />
      <LocationFieldset />
    </Stack>
  );
}
