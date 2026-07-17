import { describe, expect, it } from 'vitest';
import {
  buildKpis,
  countByKind,
  countByStatus,
  monthlyOnboarding,
  type MeetingItem,
  type StatusItem,
} from './onboardingStats';

describe('countByStatus', () => {
  it('tallies known statuses and ignores blank/unknown ones', () => {
    const items: StatusItem[] = [
      { status: 'DRAFT' },
      { status: 'SUBMITTED' },
      { status: 'SUBMITTED' },
      { status: 'APPROVED' },
      { status: 'REJECTED' },
      { status: 'WHODIS' },
      { status: null },
      {},
    ];
    expect(countByStatus(items)).toEqual({ DRAFT: 1, SUBMITTED: 2, APPROVED: 1, REJECTED: 1 });
  });

  it('returns all-zero counts for an empty list', () => {
    expect(countByStatus([])).toEqual({ DRAFT: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0 });
  });
});

describe('countByKind', () => {
  it('tallies meeting kinds and ignores blank/unknown ones', () => {
    const meetings: MeetingItem[] = [
      { kind: 'VENUE' },
      { kind: 'HOST' },
      { kind: 'HOST' },
      { kind: 'ECOMM' },
      { kind: 'OTHER' },
      { kind: null },
      {},
    ];
    expect(countByKind(meetings)).toEqual({ VENUE: 1, HOST: 2, ECOMM: 1 });
  });
});

describe('buildKpis', () => {
  it('sums totals (hosts, venues, brands, surveys) and surfaces pending + approved', () => {
    const hosts = { DRAFT: 1, SUBMITTED: 2, APPROVED: 3, REJECTED: 0 };
    const venues = { DRAFT: 0, SUBMITTED: 1, APPROVED: 4, REJECTED: 2 };
    const brands = { DRAFT: 2, SUBMITTED: 3, APPROVED: 1, REJECTED: 1 };
    expect(buildKpis(hosts, venues, brands, 5)).toEqual([
      { label: 'Total hosts', value: 6, tone: 'default', to: '/hosts' },
      { label: 'Total venues', value: 7, tone: 'default', to: '/venues' },
      { label: 'Total brands', value: 7, tone: 'default', to: '/ecomm-brands' },
      { label: 'Total surveys', value: 5, tone: 'default', to: '/surveys' },
      { label: 'Pending review', value: 6, tone: 'warning' },
      { label: 'Approved', value: 8, tone: 'success' },
    ]);
  });
});

describe('monthlyOnboarding', () => {
  const now = new Date(2026, 5, 15); // Jun 2026

  it('buckets submissions by month and skips out-of-range/missing/invalid dates', () => {
    const hosts: StatusItem[] = [
      { submitted_at: '2026-06-02' }, // current month
      { submitted_at: '2026-05-20' }, // last month
      { submitted_at: '2025-01-01' }, // far out of range -> skipped
      { submitted_at: null }, // missing -> skipped
      { submitted_at: 'not-a-date' }, // invalid -> skipped
    ];
    const venues: StatusItem[] = [{ submitted_at: '2026-06-10' }];
    const brands: StatusItem[] = [{ submitted_at: '2026-05-05' }, { submitted_at: '2026-06-15' }];
    const clubAdmins: StatusItem[] = [{ submitted_at: '2026-04-11' }, { submitted_at: '2026-06-01' }];

    const buckets = monthlyOnboarding(hosts, venues, brands, clubAdmins, 3, now);
    expect(buckets).toHaveLength(3);
    expect(buckets.map((b) => b.label)).toEqual(['Apr', 'May', 'Jun']);
    expect(buckets[2]).toEqual({ label: 'Jun', hosts: 1, venues: 1, brands: 1, club_admins: 1 });
    expect(buckets[1]).toEqual({ label: 'May', hosts: 1, venues: 0, brands: 1, club_admins: 0 });
    expect(buckets[0]).toEqual({ label: 'Apr', hosts: 0, venues: 0, brands: 0, club_admins: 1 });
  });

  it('defaults to a 6-month window when no range is given', () => {
    expect(monthlyOnboarding([], [], [], [])).toHaveLength(6);
  });
});
