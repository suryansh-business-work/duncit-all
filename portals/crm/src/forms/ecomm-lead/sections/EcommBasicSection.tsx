import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import FieldGrid from '../../fields/FieldGrid';
import SuperCategoryField from '../../fields/SuperCategoryField';
import CategorySelectors from '../../fields/CategorySelectors';
import { LocationFieldset } from '../../fields/LocationField';

export default function EcommBasicSection() {
  return (
    <Stack spacing={1.5}>
      <SuperCategoryField
        name="super_category_id"
        label="Super Category"
        required
        hint="Which super category is this seller being added under? Managed via admin."
      />
      <CategorySelectors />
      <FieldGrid>
        <FormField name="seller_name" label="Seller Name" required size="small" />
        <FormField name="brand_name" label="Brand Name" size="small" />
      </FieldGrid>
      <FormField name="business_type" label="Business Type" size="small" hint="e.g. Manufacturer, Reseller, D2C brand." />
      <LocationFieldset />
    </Stack>
  );
}
