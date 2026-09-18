import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { categoryOptions } from '../lib/taxonomy';
import type { Option } from '../lib/translate';
import { STORE_CATEGORIES, STORE_PET_TYPES, type StoreCategory, type StorePetType } from './taxonomy';

export interface TaxonomyOptions {
  petTypes: StorePetType[];
  categories: StoreCategory[];
  petTypeOptions: Option[];
  /** Every category, indented under its parent. */
  categoryOptions: Option[];
  loading: boolean;
  error: unknown;
}

/** The pet types and categories a picker files things under. */
export function useTaxonomyOptions(): TaxonomyOptions {
  const pets = useQuery(STORE_PET_TYPES, { fetchPolicy: 'cache-and-network' });
  const cats = useQuery(STORE_CATEGORIES, { fetchPolicy: 'cache-and-network' });
  const petTypes = pets.data?.storeAdminPetTypes;
  const categories = cats.data?.storeAdminCategories;
  return useMemo(
    () => ({
      petTypes: petTypes ?? [],
      categories: categories ?? [],
      petTypeOptions: (petTypes ?? []).map((p) => ({ value: p.id, label: p.name })),
      categoryOptions: categoryOptions(categories ?? []),
      loading: pets.loading || cats.loading,
      error: pets.error ?? cats.error,
    }),
    [petTypes, categories, pets.loading, cats.loading, pets.error, cats.error],
  );
}
