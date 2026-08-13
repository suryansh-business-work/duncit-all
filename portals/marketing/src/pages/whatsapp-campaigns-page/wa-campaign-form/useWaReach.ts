import { useQuery } from '@apollo/client';
import { WA_CAMPAIGN_REACH } from '../queries';
import type { WaCampaignValues } from './wa-campaign.types';

/**
 * How many messages this recipient list would actually produce right now —
 * people with a usable number, not everybody in the list. Template messages are
 * billed per message, so this is shown before the send, never discovered after
 * it, and it is the server's count for every source: a number the portal worked
 * out for itself would be a second answer that can disagree.
 */

/** Nothing to count yet — the chosen source has not been filled in. */
function isIncomplete(values: WaCampaignValues): boolean {
  if (values.audience === 'AUDIENCE_LIST') return !values.audience_list_id;
  if (values.audience === 'SPECIFIC_USERS') return values.users.length === 0;
  if (values.audience === 'MANUAL_NUMBERS') return values.contacts.length === 0;
  return false;
}

export function useWaReach(values: WaCampaignValues): number | null {
  const skip = isIncomplete(values);
  const { data } = useQuery(WA_CAMPAIGN_REACH, {
    variables: {
      audience: values.audience,
      audience_list_id: values.audience_list_id || null,
      user_ids: values.users.map((user) => user.id),
      // Names are dropped: only the number decides whether a contact is
      // reachable, and sending the name would re-ask the server on every
      // keystroke of a field that cannot change the answer.
      contacts: values.contacts.map((contact) => ({ ...contact, name: '' })),
    },
    skip,
    fetchPolicy: 'cache-and-network',
  });
  if (skip) return null;
  return data?.waCampaignReach ?? null;
}
