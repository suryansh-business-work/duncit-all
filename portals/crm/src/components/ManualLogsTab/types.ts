import type { CrmLeadEntityType } from '../../api/crm.types';
import type { CrmActivity } from '../../api/crm.types';

export type Granularity = 'all' | 'today' | 'week' | 'month';

export interface ManualLogsTabProps {
  entityType: CrmLeadEntityType;
  entityId: string;
  activities: CrmActivity[];
}

export interface LogBody {
  html: string;
  text: string;
}
