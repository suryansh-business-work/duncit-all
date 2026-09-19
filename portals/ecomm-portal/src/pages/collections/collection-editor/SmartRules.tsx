import { useMemo } from 'react';
import type { Control } from 'react-hook-form';
import { useQuery } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import RhfMultiSelect from '../../../components/form/RhfMultiSelect';
import RhfNumberField from '../../../components/form/RhfNumberField';
import RhfSwitch from '../../../components/form/RhfSwitch';
import { STORE_BRANDS } from '../../../queries/taxonomy';
import { useTaxonomyOptions } from '../../../queries/useTaxonomyOptions';
import type { CollectionValues } from './collection-form';

/**
 * A rule-built collection: every listed product matching ALL the rules set
 * here. An empty rule does not narrow anything.
 */
export default function SmartRules({ control }: Readonly<{ control: Control<CollectionValues> }>) {
  const { t } = useTranslation();
  const taxonomy = useTaxonomyOptions();
  const { data } = useQuery(STORE_BRANDS, { fetchPolicy: 'cache-and-network' });
  const brandOptions = useMemo(
    () => (data?.storeAdminBrands ?? []).map((brand) => ({ value: brand.id, label: brand.name })),
    [data],
  );
  const noLimit = t('ecommPortal.collections.blankNoLimit');
  return (
    <Stack spacing={1}>
      <Typography variant="body2" sx={{ color: 'text.secondary', pb: 1 }}>
        {t('ecommPortal.collections.rulesHint')}
      </Typography>
      <RhfMultiSelect control={control} name="rules.pet_type_ids" label={t('ecommPortal.nav.petTypes')} options={taxonomy.petTypeOptions} />
      <RhfMultiSelect
        control={control}
        name="rules.category_ids"
        label={t('ecommPortal.nav.categories')}
        options={taxonomy.categoryOptions}
        hint={t('ecommPortal.collections.categoriesHint')}
      />
      <RhfMultiSelect control={control} name="rules.brand_ids" label={t('ecommPortal.collections.brands')} options={brandOptions} />
      <RhfTextField control={control} name="rules.tags" label={t('ecommPortal.collections.tags')} hint={t('ecommPortal.form.commaHint')} />
      <Box sx={{ display: 'grid', columnGap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <RhfNumberField control={control} name="rules.min_discount_pct" label={t('ecommPortal.collections.minDiscount')} hint={noLimit} unit="%" />
        <RhfNumberField control={control} name="rules.max_price" label={t('ecommPortal.collections.maxPrice')} hint={noLimit} />
      </Box>
      <RhfSwitch control={control} name="rules.featured_only" label={t('ecommPortal.collections.featuredOnly')} />
      <RhfSwitch control={control} name="rules.in_stock_only" label={t('ecommPortal.collections.inStockOnly')} />
    </Stack>
  );
}
