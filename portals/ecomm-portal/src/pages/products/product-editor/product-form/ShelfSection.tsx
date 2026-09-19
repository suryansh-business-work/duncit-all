import { useQuery } from '@apollo/client/react';
import { Divider, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import RhfMultiSelect from '../../../../components/form/RhfMultiSelect';
import RhfNumberField from '../../../../components/form/RhfNumberField';
import RhfSwitch from '../../../../components/form/RhfSwitch';
import { STORE_FACETS } from '../../../../queries/taxonomy';
import { useTaxonomyOptions } from '../../../../queries/useTaxonomyOptions';
import type { ProductControl } from './product.types';

/** One multi-select per shopper filter, offering that filter's own options. */
function FacetFields({ control }: Readonly<{ control: ProductControl }>) {
  const { t } = useTranslation();
  const facets = useQuery(STORE_FACETS, { fetchPolicy: 'cache-and-network' }).data?.storeAdminFacets ?? [];
  if (facets.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('ecommPortal.listing.noFilters')}
      </Typography>
    );
  }
  return (
    <>
      {facets.map((facet) => (
        <RhfMultiSelect
          key={facet.id}
          control={control}
          name={`facet_values.${facet.id}`}
          label={facet.name}
          options={facet.options.map((option) => ({ value: option.slug, label: option.label }))}
          hint={t('ecommPortal.productEditor.facetNewOption')}
          freeSolo
          testId="product-facet"
        />
      ))}
    </>
  );
}

/** How the product sits on the shelf — its store title, URL key, badge and rank — and where it is filed. */
export default function ShelfSection({ control }: Readonly<{ control: ProductControl }>) {
  const { t } = useTranslation();
  const taxonomy = useTaxonomyOptions();
  return (
    <SectionCard title={t('ecommPortal.listing.shelf')}>
      <Stack spacing={1} data-testid="product-section-shelf">
        <RhfTextField control={control} name="title" label={t('ecommPortal.listing.title')} hint={t('ecommPortal.listing.titleHint')} data-testid="product-title" />
        <RhfTextField control={control} name="slug" label={t('ecommPortal.form.slug')} hint={t('ecommPortal.form.slugHint')} data-testid="product-slug" />
        <RhfTextField control={control} name="badge" label={t('ecommPortal.listing.badge')} hint={t('ecommPortal.listing.badgeHint')} data-testid="product-badge" />
        <RhfNumberField
          control={control}
          name="sort_rank"
          label={t('ecommPortal.listing.sortRank')}
          hint={t('ecommPortal.listing.sortRankHint')}
          whole
          testId="product-sort-rank"
        />
        <RhfSwitch
          control={control}
          name="featured"
          label={t('ecommPortal.products.featured')}
          hint={t('ecommPortal.listing.featuredHint')}
          testId="product-featured"
        />
        <Divider />
        <Typography component="h3" variant="subtitle2">
          {t('ecommPortal.listing.filing')}
        </Typography>
        <RhfMultiSelect
          control={control}
          name="pet_type_ids"
          label={t('ecommPortal.nav.petTypes')}
          options={taxonomy.petTypeOptions}
          testId="product-pet-types"
        />
        <RhfMultiSelect
          control={control}
          name="category_ids"
          label={t('ecommPortal.nav.categories')}
          options={taxonomy.categoryOptions}
          hint={t('ecommPortal.listing.categoriesHint')}
          testId="product-categories"
        />
        <FacetFields control={control} />
      </Stack>
    </SectionCard>
  );
}
