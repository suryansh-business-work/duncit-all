// Pure aggregation helpers for the onboarding dashboard. All chart/KPI numbers
// derive from these, so they are unit-tested to 100% while the chart wrappers
// (canvas) stay presentational.

export type OnboardingStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export const ONBOARDING_STATUSES: OnboardingStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
];

export interface StatusItem {
  status?: string | null;
  submitted_at?: string | null;
}

export type StatusCounts = Record<OnboardingStatus, number>;

export type MeetingKind = 'VENUE' | 'HOST' | 'ECOMM';

export const MEETING_KINDS: MeetingKind[] = ['VENUE', 'HOST', 'ECOMM'];

export interface MeetingItem {
  kind?: string | null;
}

export type MeetingCounts = Record<MeetingKind, number>;

export interface MonthBucket {
  label: string;
  hosts: number;
  venues: number;
  brands: number;
  club_admins: number;
}

export interface DashboardKpi {
  label: string;
  value: number;
  tone: 'default' | 'success' | 'warning';
  /** Route to open when the KPI card is clicked; omit for cross-entity totals. */
  to?: string;
}

const STATUS_SET = new Set<string>(ONBOARDING_STATUSES);

const emptyCounts = (): StatusCounts => ({ DRAFT: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0 });

/** Tally records by onboarding status; unknown/blank statuses are ignored. */
export function countByStatus(items: StatusItem[]): StatusCounts {
  const counts = emptyCounts();
  for (const item of items) {
    const status = item.status ?? '';
    if (STATUS_SET.has(status)) counts[status as OnboardingStatus] += 1;
  }
  return counts;
}

const MEETING_KIND_SET = new Set<string>(MEETING_KINDS);

/** Tally meetings by kind (VENUE/HOST/ECOMM); unknown/blank kinds are ignored. */
export function countByKind(meetings: MeetingItem[]): MeetingCounts {
  const counts: MeetingCounts = { VENUE: 0, HOST: 0, ECOMM: 0 };
  for (const meeting of meetings) {
    const kind = meeting.kind ?? '';
    if (MEETING_KIND_SET.has(kind)) counts[kind as MeetingKind] += 1;
  }
  return counts;
}

const sumCounts = (counts: StatusCounts): number =>
  ONBOARDING_STATUSES.reduce((acc, key) => acc + counts[key], 0);

/** Header KPIs: totals (hosts, venues, brands, surveys) plus pending review + approved. */
export function buildKpis(
  hostCounts: StatusCounts,
  venueCounts: StatusCounts,
  brandCounts: StatusCounts,
  surveyCount: number,
): DashboardKpi[] {
  return [
    { label: 'Total hosts', value: sumCounts(hostCounts), tone: 'default', to: '/hosts' },
    { label: 'Total venues', value: sumCounts(venueCounts), tone: 'default', to: '/venues' },
    { label: 'Total brands', value: sumCounts(brandCounts), tone: 'default', to: '/ecomm-brands' },
    { label: 'Total surveys', value: surveyCount, tone: 'default', to: '/surveys' },
    {
      label: 'Pending review',
      value: hostCounts.SUBMITTED + venueCounts.SUBMITTED + brandCounts.SUBMITTED,
      tone: 'warning',
    },
    {
      label: 'Approved',
      value: hostCounts.APPROVED + venueCounts.APPROVED + brandCounts.APPROVED,
      tone: 'success',
    },
  ];
}

const monthKey = (date: Date): string => `${date.getFullYear()}-${date.getMonth()}`;

type TrendField = 'hosts' | 'venues' | 'brands' | 'club_admins';

function addToBuckets(
  items: StatusItem[],
  field: TrendField,
  buckets: MonthBucket[],
  indexByKey: Map<string, number>,
): void {
  for (const item of items) {
    if (!item.submitted_at) continue;
    const date = new Date(item.submitted_at);
    if (Number.isNaN(date.getTime())) continue;
    const index = indexByKey.get(monthKey(date));
    if (index !== undefined) buckets[index][field] += 1;
  }
}

/** Submissions per calendar month for the trailing `monthsBack` months. Hosts /
 * venues / brands use their own `submitted_at`; Club Admins have no entity so
 * callers pass their approval-meeting timestamp shaped as `{ submitted_at }`. */
export function monthlyOnboarding(
  hosts: StatusItem[],
  venues: StatusItem[],
  brands: StatusItem[],
  clubAdmins: StatusItem[],
  monthsBack = 6,
  now: Date = new Date(),
): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  const indexByKey = new Map<string, number>();
  for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    indexByKey.set(monthKey(date), buckets.length);
    buckets.push({
      label: date.toLocaleString('en-US', { month: 'short' }),
      hosts: 0,
      venues: 0,
      brands: 0,
      club_admins: 0,
    });
  }
  addToBuckets(hosts, 'hosts', buckets, indexByKey);
  addToBuckets(venues, 'venues', buckets, indexByKey);
  addToBuckets(brands, 'brands', buckets, indexByKey);
  addToBuckets(clubAdmins, 'club_admins', buckets, indexByKey);
  return buckets;
}
