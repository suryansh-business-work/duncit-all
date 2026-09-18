import type { StoreSearchPage } from '../../graphql/catalog';
import type { ShelfControls } from './useShelfFilters';

export interface ActiveChip {
  key: string;
  label: string;
  remove: () => void;
}

/** Chips for the list-type filters: pet, brands, facet options. */
export function listChips(page: StoreSearchPage | undefined, controls: ShelfControls): ActiveChip[] {
  const { filters } = controls;
  const pets = (page?.pet_types ?? [])
    .filter((p) => p.selected && filters.pet !== '')
    .map((p) => ({ key: `pet:${p.id}`, label: p.name, remove: () => controls.setPet(filters.pet) }));
  const brands = (page?.brands ?? [])
    .filter((b) => b.selected && filters.brands.includes(b.id))
    .map((b) => ({ key: `brand:${b.id}`, label: b.name, remove: () => controls.toggleBrand(b.id) }));
  const facets = (page?.facets ?? []).flatMap((f) =>
    f.options
      .filter((o) => o.selected)
      .map((o) => ({ key: `facet:${f.slug}:${o.slug}`, label: o.label, remove: () => controls.toggleFacet(f.slug, o.slug) })),
  );
  return [...pets, ...brands, ...facets];
}

interface FlagLabels {
  price: string;
  inStock: string;
  onSale: string;
}

/** Chips for the single-value filters: price range, in stock, on sale. */
export function flagChips(controls: ShelfControls, labels: FlagLabels): ActiveChip[] {
  const { filters } = controls;
  const chips: ActiveChip[] = [];
  if (filters.min !== null || filters.max !== null) {
    chips.push({ key: 'price', label: labels.price, remove: () => controls.setPrice(null, null) });
  }
  if (filters.inStock) chips.push({ key: 'stock', label: labels.inStock, remove: () => controls.setInStock(false) });
  if (filters.onSale) chips.push({ key: 'sale', label: labels.onSale, remove: () => controls.setOnSale(false) });
  return chips;
}
