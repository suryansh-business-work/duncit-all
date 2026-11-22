import { useMutation } from '@apollo/client/react';
import { ADD_CRM_MANUAL_LOG, DELETE_CRM_MANUAL_LOG, ECOMM_LEAD, HOST_LEAD, UPDATE_CRM_MANUAL_LOG, VENUE_LEAD } from '../../api/crm.gql';
import { COMMUNITY_LEAD, CREATOR_LEAD } from '../../api/prospectLeads.gql';
import type { CrmActivity, CrmLeadEntityType } from '../../api/crm.types';
import type { LogBody } from './types';

const LEAD_QUERY = { VENUE_LEAD, HOST_LEAD, ECOMM_LEAD, CREATOR_LEAD, COMMUNITY_LEAD };

interface LogContent {
  summary: string;
  body: LogBody;
}

/**
 * Create / edit / delete a lead's manual logs. Each one refetches the lead,
 * so the list and its Created / Updated / Deleted history come straight from
 * the server.
 */
export function useManualLogActions(entityType: CrmLeadEntityType, entityId: string) {
  const options = {
    refetchQueries: [{ query: LEAD_QUERY[entityType], variables: { id: entityId } }],
    awaitRefetchQueries: true,
  };
  const [createLog, created] = useMutation<{ addCrmManualLog: CrmActivity }>(ADD_CRM_MANUAL_LOG, options);
  const [updateLog, updated] = useMutation<{ updateCrmManualLog: CrmActivity }>(UPDATE_CRM_MANUAL_LOG, options);
  const [deleteLog, deleted] = useMutation<{ deleteCrmManualLog: CrmActivity }>(DELETE_CRM_MANUAL_LOG, options);

  const target = { entity_type: entityType, entity_id: entityId };
  const content = ({ summary, body }: LogContent) => ({
    summary: summary.trim(),
    body_html: body.html,
    body_text: body.text,
  });

  return {
    saving: created.loading || updated.loading,
    deleting: deleted.loading,
    create: (value: LogContent) => createLog({ variables: { input: { ...target, ...content(value) } } }),
    update: (logId: string, value: LogContent) =>
      updateLog({ variables: { input: { ...target, log_id: logId, ...content(value) } } }),
    remove: (logId: string) => deleteLog({ variables: { ...target, log_id: logId } }),
  };
}
