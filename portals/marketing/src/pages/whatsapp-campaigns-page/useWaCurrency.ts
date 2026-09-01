import { useQuery } from '@apollo/client/react';
import { WA_PRICING, type WaPricing } from './queries';

/**
 * The symbol every money figure on this page is printed in. It lives on the
 * rate card, so the logs, the dashboard and the settings form all read the one
 * the rate card was saved with — a symbol hardcoded per surface is how three
 * screens end up disagreeing about the currency they are quoting.
 */
export function useWaCurrency(): string {
  const { data } = useQuery<{ waPricing: WaPricing }>(WA_PRICING, {
    fetchPolicy: 'cache-first',
  });
  return data?.waPricing.currency_symbol ?? '₹';
}
