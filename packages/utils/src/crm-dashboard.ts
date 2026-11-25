/**
 * The CRM dashboard's numbers — shared by the CRM portal's Dashboard page and
 * the Duncit CRM app's, so both count the same leads the same way. Pure: the
 * caller fetches the venue and host leads, picks the date range, and renders.
 */

export type CrmDashboardRange = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

/** The ranges in the order the range picker offers them. */
export const CRM_DASHBOARD_RANGES: readonly CrmDashboardRange[] = ['today', 'week', 'month', 'year', 'all', 'custom'];

export interface CrmDateWindow {
  from?: Date;
  to?: Date;
}

/** The fields of a venue or host lead the dashboard reads. */
export interface CrmDashboardLead {
  lead_status: string;
  priority?: string | null;
  created_at?: string | null;
  super_category_id?: string | null;
  super_category?: { name?: string | null } | null;
  services_offered?: ReadonlyArray<{ service?: string | null; custom_name?: string | null }> | null;
}

export interface CrmStageCount {
  stage: string;
  venue: number;
  host: number;
  total: number;
}

export interface CrmServiceCount {
  label: string;
  count: number;
}

export interface CrmSuperCategoryCount {
  super_category_id: string;
  label: string;
  venue: number;
  host: number;
  total: number;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
/** Monday-first, as the portal's weeks are. */
const startOfWeek = (d: Date) => {
  const day = startOfDay(d);
  const back = (day.getDay() + 6) % 7;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - back);
};

/**
 * The window a range covers, ending now: calendar today (midnight onwards, not
 * the last 24 hours), this week from Monday, this month, this year, or all
 * time. A custom window covers whole days, so its last day is included.
 */
export function crmRangeToWindow(range: CrmDashboardRange, custom: CrmDateWindow, now: Date = new Date()): CrmDateWindow {
  switch (range) {
    case 'today':
      return { from: startOfDay(now), to: now };
    case 'week':
      return { from: startOfWeek(now), to: now };
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case 'year':
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    case 'custom':
      return {
        from: custom.from ? startOfDay(custom.from) : undefined,
        to: custom.to ? endOfDay(custom.to) : undefined,
      };
    default:
      return {};
  }
}

/** Whether a lead created at `timestamp` falls inside the window (a missing or bad date never does). */
export function crmIsInWindow(timestamp: string | null | undefined, window: CrmDateWindow): boolean {
  if (!timestamp) return false;
  const t = new Date(timestamp).getTime();
  if (Number.isNaN(t)) return false;
  if (window.from && t < window.from.getTime()) return false;
  if (window.to && t > window.to.getTime()) return false;
  return true;
}

/** The leads created inside the window; all of them when the window is open on both ends. */
export function crmLeadsInWindow<T extends CrmDashboardLead>(leads: readonly T[], window: CrmDateWindow): T[] {
  return window.from || window.to ? leads.filter((lead) => crmIsInWindow(lead.created_at, window)) : [...leads];
}

/** A service row's name: the free-text name when the service is "Other", else the catalogue value. */
export const crmServiceLabel = (row: { service?: string | null; custom_name?: string | null }): string => {
  if (row.service === 'Other') return (row.custom_name ?? '').trim() || 'Other';
  return (row.service ?? '').trim();
};

/** Leads per pipeline stage: every venue and host stage, with each kind counted apart. */
export function crmAggregateStages(
  venueStages: readonly string[],
  hostStages: readonly string[],
  venueLeads: readonly CrmDashboardLead[],
  hostLeads: readonly CrmDashboardLead[],
): CrmStageCount[] {
  const stages = Array.from(new Set([...venueStages, ...hostStages]));
  return stages.map((stage) => {
    const venue = venueLeads.filter((l) => l.lead_status === stage).length;
    const host = hostLeads.filter((l) => l.lead_status === stage).length;
    return { stage, venue, host, total: venue + host };
  });
}

/** Leads per priority, venue and host together. */
export function crmAggregatePriorities(
  labels: readonly string[],
  venueLeads: readonly CrmDashboardLead[],
  hostLeads: readonly CrmDashboardLead[],
): { label: string; count: number }[] {
  return labels.map((label) => ({
    label,
    count: venueLeads.filter((l) => l.priority === label).length + hostLeads.filter((l) => l.priority === label).length,
  }));
}

/** Every service mention across both kinds, most frequent first, with the totals the KPI shows. */
export function crmAggregateServices(
  venueLeads: readonly CrmDashboardLead[],
  hostLeads: readonly CrmDashboardLead[],
): {
  services: CrmServiceCount[];
  serviceTotals: { uniqueServices: number; totalServiceRows: number; leadsWithServices: number };
} {
  const tally = new Map<string, number>();
  let totalServiceRows = 0;
  let leadsWithServices = 0;
  for (const lead of [...venueLeads, ...hostLeads]) {
    let hadAny = false;
    for (const row of lead.services_offered ?? []) {
      const label = crmServiceLabel(row);
      if (!label) continue;
      tally.set(label, (tally.get(label) ?? 0) + 1);
      totalServiceRows += 1;
      hadAny = true;
    }
    if (hadAny) leadsWithServices += 1;
  }
  const services = Array.from(tally.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return { services, serviceTotals: { uniqueServices: services.length, totalServiceRows, leadsWithServices } };
}

/** Above this many categories, empty ones are left out so the chart stays readable. */
const SHOW_EMPTY_UP_TO = 8;
const ORPHAN_KEY = '__none__';

/**
 * Venue vs host leads per super category: starts from the admin catalogue (so
 * an empty category shows while the list is short) and puts leads whose
 * category is unknown under `uncategorisedLabel`.
 */
export function crmAggregateSuperCategories(
  superCategories: ReadonlyArray<{ id: string; name: string }>,
  venueLeads: readonly CrmDashboardLead[],
  hostLeads: readonly CrmDashboardLead[],
  uncategorisedLabel: string,
): CrmSuperCategoryCount[] {
  const buckets = new Map<string, CrmSuperCategoryCount>();
  for (const sc of superCategories) {
    buckets.set(sc.id, { super_category_id: sc.id, label: sc.name, venue: 0, host: 0, total: 0 });
  }
  const bump = (lead: CrmDashboardLead, kind: 'venue' | 'host') => {
    const key = lead.super_category_id || ORPHAN_KEY;
    let bucket = buckets.get(key);
    if (!bucket) {
      const label = key === ORPHAN_KEY ? uncategorisedLabel : lead.super_category?.name || uncategorisedLabel;
      bucket = { super_category_id: key, label, venue: 0, host: 0, total: 0 };
      buckets.set(key, bucket);
    }
    bucket[kind] += 1;
    bucket.total += 1;
  };
  for (const lead of venueLeads) bump(lead, 'venue');
  for (const lead of hostLeads) bump(lead, 'host');
  return Array.from(buckets.values())
    .filter((b, _, all) => b.total > 0 || all.length <= SHOW_EMPTY_UP_TO)
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

const WON = /won|converted|closed.*won/i;

/** The headline counts, and conversion as the share of leads in a won/converted stage. */
export function crmAggregateTotals(
  venueLeads: readonly CrmDashboardLead[],
  hostLeads: readonly CrmDashboardLead[],
): { venue: number; host: number; total: number; conversionRate: number } {
  const venue = venueLeads.length;
  const host = hostLeads.length;
  const total = venue + host;
  const won = [...venueLeads, ...hostLeads].filter((l) => WON.test(l.lead_status)).length;
  return { venue, host, total, conversionRate: total ? (won / total) * 100 : 0 };
}
