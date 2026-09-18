import { useQuery } from '@apollo/client/react';
import type { Control } from 'react-hook-form';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import RhfMultiSelect from '../../../../components/form/RhfMultiSelect';
import RhfNumberField from '../../../../components/form/RhfNumberField';
import RhfSwitch from '../../../../components/form/RhfSwitch';
import { STORE_FACETS } from '../../../../queries/taxonomy';
import { useTaxonomyOptions } from '../../../../queries/useTaxonomyOptions';
import type { ListingValues } from './listing.types';

type ListingControl = Control<ListingValues>;

const twoColumns = { display: 'grid', columnGap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } };

/** One multi-select per shopper filter, offering that filter's own options. */
function FacetFields({ control }: Readonly<{ control: ListingControl }>) {
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
        />
      ))}
    </>
  );
}

/** Whether and how the product sits on the shelf, and where it is filed. */
export default function ListingShelfSection({ control }: Readonly<{ control: ListingControl }>) {
  const { t } = useTranslation();
  const taxonomy = useTaxonomyOptions();
  return (
    <SectionCard title={t('ecommPortal.listing.shelf')}>
      <Stack spacing={1}>
        <RhfSwitch control={control} name="listed" label={t('ecommPortal.products.listOnStore')} hint={t('ecommPortal.listing.listedHint')} />
        <RhfTextField control={control} name="title" label={t('ecommPortal.listing.title')} hint={t('ecommPortal.listing.titleHint')} />
        <RhfTextField control={control} name="slug" label={t('ecommPortal.form.slug')} hint={t('ecommPortal.form.slugHint')} />
        <Box sx={twoColumns}>
          <RhfTextField control={control} name="badge" label={t('ecommPortal.listing.badge')} hint={t('ecommPortal.listing.badgeHint')} />
          <RhfNumberField control={control} name="sort_rank" label={t('ecommPortal.listing.sortRank')} hint={t('ecommPortal.listing.sortRankHint')} whole />
        </Box>
        <RhfSwitch control={control} name="featured" label={t('ecommPortal.products.featured')} hint={t('ecommPortal.listing.featuredHint')} />
        <Divider />
        <Typography component="h3" variant="subtitle2">
          {t('ecommPortal.listing.filing')}
        </Typography>
        <RhfMultiSelect control={control} name="pet_type_ids" label={t('ecommPortal.nav.petTypes')} options={taxonomy.petTypeOptions} />
        <RhfMultiSelect
          control={control}
          name="category_ids"
          label={t('ecommPortal.nav.categories')}
          options={taxonomy.categoryOptions}
          hint={t('ecommPortal.listing.categoriesHint')}
        />
        <FacetFields control={control} />
      </Stack>
    </SectionCard>
  );
}
