import type { CrmServiceOffered, HostLead, SuperCategoryOption, VenueLead } from '../../api/crm.types';
import type { ServiceCount, StageCount, SuperCategoryCount } from './dashboardConfig';

const WON_RE = /won|converted|closed.*won/i;

/** Display label: free-text `custom_name` when service is "Other", else catalogue value. */
export const serviceLabel = (s: CrmServiceOffered): string => {
  if (s.service === 'Other') return (s.custom_name ?? '').trim() || 'Other';
  return (s.service ?? '').trim();
};

/** Stage breakdown: union of venue + host stages, with separate counts. */
export function aggregateStages(
  venueStages: string[],
  hostStages: string[],
  venueLeads: VenueLead[],
  hostLeads: HostLead[]
): StageCount[] {
  const stages = Array.from(new Set([...venueStages, ...hostStages]));
  return stages.map((stage) => {
    const venue = venueLeads.filter((l) => l.lead_status === stage).length;
    const host = hostLeads.filter((l) => l.lead_status === stage).length;
    return { stage, venue, host, total: venue + host };
  });
}

/** Priority breakdown across venue + host. */
export function aggregatePriorities(
  labels: string[],
  venueLeads: VenueLead[],
  hostLeads: HostLead[]
): { label: string; count: number }[] {
  return labels.map((label) => ({
    label,
    count:
      venueLeads.filter((l) => l.priority === label).length +
      hostLeads.filter((l) => l.priority === label).length,
  }));
}

/** Tally of every service mention across both lead types, sorted by frequency. */
export function aggregateServices(
  venueLeads: VenueLead[],
  hostLeads: HostLead[]
): {
  services: ServiceCount[];
  serviceTotals: { uniqueServices: number; totalServiceRows: number; leadsWithServices: number };
} {
  const tally = new Map<string, number>();
  let totalServiceRows = 0;
  let leadsWithServices = 0;
  const collect = (leadServices: CrmServiceOffered[] | undefined) => {
    if (!leadServices || leadServices.length === 0) return;
    let hadAny = false;
    for (const row of leadServices) {
      const label = serviceLabel(row);
      if (!label) continue;
      tally.set(label, (tally.get(label) ?? 0) + 1);
      totalServiceRows += 1;
      hadAny = true;
    }
    if (hadAny) leadsWithServices += 1;
  };
  venueLeads.forEach((l) => collect(l.services_offered));
  hostLeads.forEach((l) => collect(l.services_offered));
  const services: ServiceCount[] = Array.from(tally.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return {
    services,
    serviceTotals: { uniqueServices: services.length, totalServiceRows, leadsWithServices },
  };
}

/**
 * Per-super-category breakdown of Venue vs Host leads. Pre-populates from the
 * admin catalogue (so empty buckets surface when the list is short) and
 * routes leads whose super_category_id is unknown into "Uncategorised".
 */
export function aggregateSuperCategories(
  superCategories: SuperCategoryOption[],
  venueLeads: VenueLead[],
  hostLeads: HostLead[]
): SuperCategoryCount[] {
  const buckets = new Map<string, SuperCategoryCount>();
  for (const sc of superCategories) {
    buckets.set(sc.id, { super_category_id: sc.id, label: sc.name, venue: 0, host: 0, total: 0 });
  }
  const orphanKey = '__none__';
  const orphanLabel = 'Uncategorised';
  const bump = (id: string | null | undefined, kind: 'venue' | 'host', nameHint?: string | null) => {
    const key = id || orphanKey;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        super_category_id: key,
        label: key === orphanKey ? orphanLabel : nameHint || orphanLabel,
        venue: 0,
        host: 0,
        total: 0,
      };
      buckets.set(key, bucket);
    }
    bucket[kind] += 1;
    bucket.total += 1;
  };
  for (const l of venueLeads) bump(l.super_category_id, 'venue', l.super_category?.name);
  for (const l of hostLeads) bump(l.super_category_id, 'host', l.super_category?.name);

  return Array.from(buckets.values())
    .filter((b, _, arr) => b.total > 0 || arr.length <= 8)
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

/** Headline counts + conversion percentage (Won / Total). */
export function aggregateTotals(
  venueLeads: VenueLead[],
  hostLeads: HostLead[]
): { venue: number; host: number; total: number; conversionRate: number } {
  const venue = venueLeads.length;
  const host = hostLeads.length;
  const total = venue + host;
  const won =
    venueLeads.filter((l) => WON_RE.test(l.lead_status)).length +
    hostLeads.filter((l) => WON_RE.test(l.lead_status)).length;
  const conversionRate = total ? (won / total) * 100 : 0;
  return { venue, host, total, conversionRate };
}
