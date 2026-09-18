import { Divider, FormControlLabel, Stack, Switch } from '@mui/material';

import type { StoreSearchPage } from '../../../graphql/catalog';
import { useStoreT } from '../../../i18n';
import type { ShelfControls, ShelfScope } from '../useShelfFilters';
import { FacetGroup } from './FacetGroup';
import { PriceFilter } from './PriceFilter';

interface FilterPanelProps {
  page: StoreSearchPage | undefined;
  controls: ShelfControls;
  scope: ShelfScope;
}

/** Every filter the search answers with counts for: pet, price, brand, facets, stock, sale. */
export function FilterPanel({ page, controls, scope }: Readonly<FilterPanelProps>) {
  const { t } = useStoreT();
  const { filters } = controls;
  return (
    <Stack spacing={2.5} divider={<Divider flexItem />}>
      {scope.pet_type ? null : (
        <FacetGroup
          title={t('ecommStore.filters.petType')}
          options={(page?.pet_types ?? []).map((p) => ({ value: p.slug ?? p.id, label: p.name, count: p.count, selected: p.selected }))}
          onToggle={controls.setPet}
        />
      )}
      <PriceFilter
        floor={page?.price_min ?? 0}
        ceiling={page?.price_max ?? 0}
        min={filters.min}
        max={filters.max}
        onCommit={controls.setPrice}
      />
      {scope.brand_ids ? null : (
        <FacetGroup
          title={t('ecommStore.filters.brand')}
          options={(page?.brands ?? []).map((b) => ({ value: b.id, label: b.name, count: b.count, selected: b.selected }))}
          onToggle={controls.toggleBrand}
        />
      )}
      {(page?.facets ?? []).map((facet) => (
        <FacetGroup
          key={facet.id}
          title={facet.name}
          options={facet.options.map((o) => ({ value: o.slug, label: o.label, count: o.count, selected: o.selected }))}
          onToggle={(value) => controls.toggleFacet(facet.slug, value)}
        />
      ))}
      <Stack>
        <FormControlLabel
          control={<Switch checked={filters.inStock} onChange={(e) => controls.setInStock(e.target.checked)} />}
          label={t('ecommStore.filters.inStock')}
        />
        <FormControlLabel
          control={<Switch checked={filters.onSale} onChange={(e) => controls.setOnSale(e.target.checked)} />}
          label={t('ecommStore.filters.onSale')}
        />
      </Stack>
    </Stack>
  );
}
