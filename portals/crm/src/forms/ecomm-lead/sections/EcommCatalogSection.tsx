import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import FieldGrid from '../../fields/FieldGrid';
import TagsField from '../../fields/TagsField';
import { useTranslation } from '@duncit/shell';

export default function EcommCatalogSection() {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <TagsField
        name="product_categories"
        label={t('crm.common.productCategories')}
        helperText={t('crm.forms.whatTheSellerSellsEG')}
      />
      <FieldGrid>
        <FormField name="catalog_size" label={t('crm.forms.catalogueSize')} size="small" hint="Approx. number of SKUs, e.g. 10-50." />
        <FormField name="price_range" label={t('crm.forms.priceRange')} size="small" hint="e.g. ₹200 – ₹2000." />
      </FieldGrid>
      <FieldGrid>
        <FormField name="fulfilment_mode" label={t('crm.forms.fulfilmentMode')} size="small" hint="e.g. Self-ship, Courier, Pickup at pods." />
        <FormField name="monthly_orders" label={t('crm.forms.monthlyOrders')} size="small" hint="Approx. current order volume." />
      </FieldGrid>
    </Stack>
  );
}
