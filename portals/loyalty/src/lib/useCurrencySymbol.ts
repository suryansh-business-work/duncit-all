import type { DocumentNode } from 'graphql';
import { useQuery } from '@apollo/client/react';

interface CurrencyData {
  publicFinanceSettings?: { currency_symbol?: string | null } | null;
}

/** Used only until Finance's setting has loaded, so a figure is never unlabelled. */
const FALLBACK_SYMBOL = '₹';

/**
 * The admin-configured currency symbol (Finance settings) — card amounts are
 * rupees, and the symbol is configured rather than assumed. Each page passes
 * its own query document so its operation stays separately mockable.
 */
export function useCurrencySymbol(query: DocumentNode): string {
  const { data } = useQuery<CurrencyData>(query, { fetchPolicy: 'cache-first' });
  return data?.publicFinanceSettings?.currency_symbol || FALLBACK_SYMBOL;
}
