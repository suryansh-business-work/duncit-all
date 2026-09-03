import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CLUB_ADMIN_RANGE,
  clubAdminKpiGroups,
  clubAdminKpiValue,
  clubAdminRangeFrom,
  clubAdminRanges,
  clubAdminTrendSeries,
  emptyClubAdminDashboard,
  emptyClubAdminKpis,
  formatCount,
  formatPercent,
  formatRating,
  type ClubAdminKpis,
} from '../src/club-admin-dashboard';

/** A Koramangala running club's admin, over the last twelve months. */
const KPIS: ClubAdminKpis = {
  assigned_clubs: 2,
  total_pods: 38,
  upcoming_pods: 5,
  completed_pods: 31,
  total_bookings: 412,
  backed_out: 17,
  total_attendees: 388,
  total_spots: 520,
  fill_rate: 0.746,
  total_followers: 1_284,
  new_followers: 212,
  avg_rating: 4.36,
  ratings_count: 97,
  active_hosts: 6,
  total_revenue: 186_500,
  currency_symbol: '₹',
};

describe('clubAdminKpiGroups', () => {
  it('draws four groups of fourteen cards in the console order', () => {
    const groups = clubAdminKpiGroups(KPIS);
    expect(groups.map((group) => group.key)).toEqual(['overview', 'engagement', 'community', 'revenue']);
    expect(groups.map((group) => group.cards.length)).toEqual([4, 4, 4, 2]);
    expect(groups.flatMap((group) => group.cards.map((card) => card.key))).toEqual([
      'assigned_clubs',
      'total_pods',
      'upcoming_pods',
      'completed_pods',
      'total_bookings',
      'total_attendees',
      'fill_rate',
      'backed_out',
      'total_followers',
      'new_followers',
      'avg_rating',
      'active_hosts',
      'total_revenue',
      'total_spots',
    ]);
  });

  it('marks how each figure is written and carries the ratings count on the rating card', () => {
    const cards = clubAdminKpiGroups(KPIS).flatMap((group) => group.cards);
    const kinds = Object.fromEntries(cards.map((card) => [card.key, card.kind]));
    expect(kinds.fill_rate).toBe('percent');
    expect(kinds.avg_rating).toBe('rating');
    expect(kinds.total_revenue).toBe('money');
    expect(kinds.total_spots).toBe('count');
    expect(cards.find((card) => card.key === 'avg_rating')).toEqual({
      key: 'avg_rating',
      kind: 'rating',
      value: 4.36,
      count: 97,
    });
    expect(cards.find((card) => card.key === 'total_revenue')).toEqual({
      key: 'total_revenue',
      kind: 'money',
      value: 186_500,
    });
  });

  it('draws every card at zero before the query answers', () => {
    const cards = clubAdminKpiGroups(emptyClubAdminKpis).flatMap((group) => group.cards);
    expect(cards.every((card) => card.value === 0)).toBe(true);
    expect(emptyClubAdminDashboard).toEqual({
      kpis: emptyClubAdminKpis,
      trend: [],
      clubs: [],
      categories: [],
    });
  });
});

describe('the formatters', () => {
  it('group counts the Indian way and treat a missing number as zero', () => {
    expect(formatCount(125_000)).toBe('1,25,000');
    expect(formatCount(0)).toBe('0');
    expect(formatCount(Number.NaN)).toBe('0');
  });

  it('write a fraction as a whole percentage', () => {
    expect(formatPercent(0.746)).toBe('75%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(Number.NaN)).toBe('0%');
  });

  it('write a rating to one decimal', () => {
    expect(formatRating(4.36)).toBe('4.4');
    expect(formatRating(0)).toBe('0.0');
    expect(formatRating(Number.NaN)).toBe('0.0');
  });
});

describe('clubAdminKpiValue', () => {
  it('writes each kind the way the console does', () => {
    const cards = clubAdminKpiGroups(KPIS).flatMap((group) => group.cards);
    const value = (key: string) =>
      clubAdminKpiValue(cards.find((card) => card.key === key)!, KPIS.currency_symbol);
    expect(value('total_followers')).toBe('1,284');
    expect(value('fill_rate')).toBe('75%');
    expect(value('avg_rating')).toBe('4.4 (97)');
    expect(value('total_revenue')).toBe('₹1,86,500');
  });

  it('writes a rating over no count as zero ratings', () => {
    expect(clubAdminKpiValue({ key: 'avg_rating', kind: 'rating', value: 4.36 }, '₹')).toBe('4.4 (0)');
  });

  it('formats money with the currency the server answered with', () => {
    expect(clubAdminKpiValue({ key: 'total_revenue', kind: 'money', value: 1_250 }, '$')).toBe('$1,250');
  });
});

describe('the ranges', () => {
  const now = new Date(2026, 8, 3, 15, 30);

  it('open on the last twelve months', () => {
    expect(DEFAULT_CLUB_ADMIN_RANGE).toBe('12m');
  });

  it('turn each range into the from boundary the query takes', () => {
    expect(clubAdminRangeFrom('30d', now)).toBe(new Date(2026, 7, 4, 15, 30).toISOString());
    expect(clubAdminRangeFrom('month', now)).toBe(new Date(2026, 8, 1).toISOString());
    expect(clubAdminRangeFrom('12m', now)).toBe(new Date(2025, 8, 3, 15, 30).toISOString());
    expect(clubAdminRangeFrom('all', now)).toBeNull();
  });

  it('clamp a leap day to the shorter month a year earlier', () => {
    expect(clubAdminRangeFrom('12m', new Date(2028, 1, 29, 9))).toBe(
      new Date(2027, 1, 28, 9).toISOString(),
    );
  });

  it('default to the clock when no now is given', () => {
    const before = Date.now();
    const from = clubAdminRangeFrom('30d');
    const expected = before - 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(new Date(from as string).getTime() - expected)).toBeLessThan(2 * 60 * 60 * 1000);
  });

  it('list the select rows in order, each answering its own boundary', () => {
    expect(clubAdminRanges.map((range) => range.value)).toEqual(['30d', 'month', '12m', 'all']);
    expect(clubAdminRanges.map((range) => range.from(now))).toEqual([
      new Date(2026, 7, 4, 15, 30).toISOString(),
      new Date(2026, 8, 1).toISOString(),
      new Date(2025, 8, 3, 15, 30).toISOString(),
      null,
    ]);
  });
});

describe('clubAdminTrendSeries', () => {
  it('draws the four lines in order, each on its own palette colour', () => {
    expect(clubAdminTrendSeries).toEqual([
      { key: 'pods', palette: 'primary' },
      { key: 'bookings', palette: 'success' },
      { key: 'followers', palette: 'info' },
      { key: 'revenue', palette: 'warning' },
    ]);
  });
});
