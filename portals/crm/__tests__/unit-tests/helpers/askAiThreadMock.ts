import type { MockedResponse } from '@apollo/client/testing';
import { CRM_LEAD_AI_THREAD } from '@/api/askAi.gql';

/** An empty Ask AI thread for one lead, with a one-source context summary. */
export const emptyAskAiThread = (entity: string, leadId: string): MockedResponse => ({
  request: { query: CRM_LEAD_AI_THREAD, variables: { entity, lead_id: leadId } },
  result: {
    data: {
      crmLeadAiThread: {
        __typename: 'CrmLeadAiThread',
        messages: [],
        context: {
          __typename: 'CrmLeadAiContext',
          total_tokens: 120,
          total_chars: 1024,
          built_at: '2026-11-21T10:00:00.000Z',
          sources: [{ __typename: 'CrmLeadAiContextSource', key: 'profile', items: 1, chars: 1024, tokens: 120, truncated: false }],
        },
      },
    },
  },
});
