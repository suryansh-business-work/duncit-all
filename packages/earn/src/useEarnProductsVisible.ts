import { useProductVisibility } from '@duncit/app-settings';

/**
 * Whether the product-seller journey is visible. A thin alias over the shared
 * `useProductVisibility` so this package reads the one system kill switch
 * rather than keeping a second copy of the rule (rule 40).
 */
export function useEarnProductsVisible(): boolean {
  return useProductVisibility().visible;
}
