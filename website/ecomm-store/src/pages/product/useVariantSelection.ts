import { useMemo, useState } from 'react';

import type { StoreProduct, StoreVariant } from '../../graphql/product';

export type Selection = Record<string, string>;

const valueOf = (variant: StoreVariant, option: string): string | undefined =>
  variant.option_values.find((ov) => ov.name === option)?.value;

/** A variant matches when it agrees with every option chosen so far. */
const agrees = (variant: StoreVariant, selection: Selection, skip?: string): boolean =>
  Object.entries(selection).every(([name, value]) => name === skip || valueOf(variant, name) === value);

function initialSelection(product: StoreProduct): Selection {
  const start =
    product.variants.find((v) => v.id === product.default_variant_id) ??
    product.variants.find((v) => v.in_stock) ??
    product.variants[0];
  const selection: Selection = {};
  for (const ov of start?.option_values ?? []) selection[ov.name] = ov.value;
  return selection;
}

export type ValueState = 'available' | 'out-of-stock' | 'impossible';

/**
 * The shopper's option choices, the variant they add up to, and — for each
 * value on screen — whether picking it leads to a real variant, and whether
 * that variant is in stock.
 */
export function useVariantSelection(product: StoreProduct) {
  const [selection, setSelection] = useState<Selection>(() => initialSelection(product));

  const variant = useMemo(() => {
    if (!product.has_variants) return null;
    return product.variants.find((v) => product.options.every((o) => valueOf(v, o.name) === selection[o.name])) ?? null;
  }, [product, selection]);

  const stateOf = (option: string, value: string): ValueState => {
    const candidates = product.variants.filter((v) => valueOf(v, option) === value && agrees(v, selection, option));
    if (candidates.length === 0) return 'impossible';
    return candidates.some((v) => v.in_stock) ? 'available' : 'out-of-stock';
  };

  const choose = (option: string, value: string) => {
    const next = { ...selection, [option]: value };
    // Keep every other choice that still leads somewhere; drop the ones that do not.
    const reachable = product.variants.find((v) => agrees(v, next));
    if (reachable) setSelection(next);
    else setSelection({ [option]: value });
  };

  return { selection, variant, stateOf, choose };
}
