import { useEffect, useRef } from 'react';
import {
  useWatch,
  type Control,
  type UseFormGetValues,
  type UseFormSetValue,
} from 'react-hook-form';
import type { ProductListingValues } from './list-products.types';
import { generateVariants } from './list-products.map';

export const AUTO_VARIANTS_DELAY_MS = 300;

/** Rebuild the variant matrix (debounced) whenever the product options change,
 * so variant tabs appear automatically without a "Generate variants" button.
 * Skips while no option is complete, so manually added variants are never
 * wiped, and skips the initial render (loaded products keep their variants). */
export function useAutoVariants(
  control: Control<ProductListingValues>,
  getValues: UseFormGetValues<ProductListingValues>,
  setValue: UseFormSetValue<ProductListingValues>,
) {
  const options = useWatch({ control, name: 'options' });
  const optionsKey = JSON.stringify(options ?? []);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const active = (options ?? []).filter((option) => option.name.trim() && option.values.length > 0);
    if (active.length === 0) return undefined;
    const timer = setTimeout(() => {
      setValue('variants', generateVariants(options, getValues('variants')), { shouldValidate: false });
    }, AUTO_VARIANTS_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey]);
}
