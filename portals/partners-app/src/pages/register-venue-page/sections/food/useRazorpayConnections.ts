import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  MY_PARTNER_INTEGRATIONS,
  type PartnerIntegration,
} from '../../../ecomm-brand-page/integrations/integrations.queries';

/**
 * The signed-in owner's saved Razorpay connections — the accounts a venue's
 * food orders can be paid into. Reads the same saved-connections query the
 * connection dialog refetches after a save, so a new account shows up here
 * without asking again.
 */
export function useRazorpayConnections() {
  const { data, loading, error } = useQuery(MY_PARTNER_INTEGRATIONS, { fetchPolicy: 'cache-and-network' });
  const connections = useMemo<PartnerIntegration[]>(
    () => (data?.myPartnerIntegrations ?? []).filter((connection) => connection.provider === 'RAZORPAY'),
    [data],
  );
  return { connections, loading: loading && !data, error };
}
