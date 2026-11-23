import type { CrmActivity, CrmLeadEntityType, CrmStaffUser } from '../../api/crm.types';

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

/** The composer is closed, writing a new log, or editing one. */
export type ComposerMode = { kind: 'closed' } | { kind: 'new' } | { kind: 'edit'; log: CrmActivity };

/** Names for the user ids on the page, and a way to open someone's details. */
export interface LogPeople {
  byId: ReadonlyMap<string, CrmStaffUser>;
  onOpenPerson: (userId: string) => void;
}
