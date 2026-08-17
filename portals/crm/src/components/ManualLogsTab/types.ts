import type { CrmActivity } from '../../api/crm.types';

export type Granularity = 'all' | 'today' | 'week' | 'month';

export interface ManualLogsTabProps {
  entityType: 'VENUE_LEAD' | 'HOST_LEAD' | 'ECOMM_LEAD';
  entityId: string;
  activities: CrmActivity[];
}

export interface LogBody {
  html: string;
  text: string;
}
