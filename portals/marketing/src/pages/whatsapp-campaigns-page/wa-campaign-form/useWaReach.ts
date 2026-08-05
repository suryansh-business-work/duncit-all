import { useQuery } from '@apollo/client';
import { WA_CAMPAIGN_REACH } from '../queries';

/**
 * How many people the chosen audience reaches on WhatsApp right now — people
 * with a usable number, not everybody in the list. Template messages are billed
 * per message, so this is shown before the send, never discovered after it.
 */
export function useWaReach(audience: string, audienceListId: string): number | null {
  const skip = audience === 'AUDIENCE_LIST' && !audienceListId;
  const { data } = useQuery(WA_CAMPAIGN_REACH, {
    variables: { audience, audience_list_id: audienceListId || null },
    skip,
    fetchPolicy: 'cache-and-network',
  });
  if (skip) return null;
  return data?.waCampaignReach ?? null;
}
