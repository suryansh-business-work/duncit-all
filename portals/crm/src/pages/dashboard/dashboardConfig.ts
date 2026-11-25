import {
  crmIsInWindow,
  crmRangeToWindow,
  type CrmDashboardRange,
  type CrmDateWindow,
  type CrmServiceCount,
  type CrmStageCount,
  type CrmSuperCategoryCount,
} from '@duncit/utils';

/*
  The dashboard's date windows and counts live in @duncit/utils (crm-dashboard),
  shared with the Duncit CRM app's Dashboard so both count the same leads the
  same way. These names are the portal's own, kept for its pages and tests.
*/
export type DashboardRange = CrmDashboardRange;
export type DateWindow = CrmDateWindow;
export type StageCount = CrmStageCount;
export type ServiceCount = CrmServiceCount;
export type SuperCategoryCount = CrmSuperCategoryCount;

export const RANGE_LABELS: Record<DashboardRange, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
  year: 'This year',
  all: 'All time',
  custom: 'Custom',
};

export function rangeToWindow(range: DashboardRange, custom: DateWindow): DateWindow {
  return crmRangeToWindow(range, custom);
}

export const isInWindow = crmIsInWindow;
