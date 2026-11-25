import { formatDateTime } from '@duncit/app-settings';

/**
 * The windows, day groups, history and people of a lead's manual logs live in
 * @duncit/utils (crm-manual-logs), shared with the Duncit CRM app so both show
 * the same logs; re-exported here under the names this tab already uses.
 */
export {
  CRM_LOG_HISTORY_TYPES as LOG_HISTORY_TYPES,
  crmGroupLogs as groupLogs,
  crmLogHistory as logHistory,
  crmLogKey as logKey,
  crmLogPeopleIds as peopleIds,
  type CrmLogHistoryType as LogHistoryType,
} from '@duncit/utils';

export const formatLogTimestamp = (iso?: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return formatDateTime(date);
};
