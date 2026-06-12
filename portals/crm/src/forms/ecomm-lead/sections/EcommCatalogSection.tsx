import { Stack } from '@mui/material';
import FormField from '../../FormField';
import FieldGrid from '../../fields/FieldGrid';
import TagsField from '../../fields/TagsField';

export default function EcommCatalogSection() {
  return (
    <Stack spacing={1.5}>
      <TagsField
        name="product_categories"
        label="Product categories"
        helperText="What the seller sells — e.g. apparel, snacks, decor. Press Enter to add."
      />
      <FieldGrid>
        <FormField name="catalog_size" label="Catalogue Size" size="small" hint="Approx. number of SKUs, e.g. 10-50." />
        <FormField name="price_range" label="Price Range" size="small" hint="e.g. ₹200 – ₹2000." />
      </FieldGrid>
      <FieldGrid>
        <FormField name="fulfilment_mode" label="Fulfilment Mode" size="small" hint="e.g. Self-ship, Courier, Pickup at pods." />
        <FormField name="monthly_orders" label="Monthly Orders" size="small" hint="Approx. current order volume." />
      </FieldGrid>
    </Stack>
  );
}
