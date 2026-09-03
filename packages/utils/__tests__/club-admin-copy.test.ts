import { describe, expect, it } from 'vitest';

import {
  clubAdminGroupHeadings,
  clubAdminKpiLabels,
  clubAdminLabels,
  clubAdminRangeLabels,
  clubAdminSeriesLabels,
  type ClubAdminTranslate,
} from '../src/club-admin-copy';
import { clubAdminKpiGroups, emptyClubAdminKpis } from '../src/club-admin-dashboard';

/**
 * A translator that answers with the key and whatever it was handed, so an
 * assertion sees both WHICH sentence was picked and the values it names.
 */
const t: ClubAdminTranslate = (key, options) => {
  const vars = Object.entries(options?.vars ?? {}).map(([name, value]) => `${name}=${value}`);
  return vars.length > 0 ? `${key}(${vars.join(',')})` : key;
};

describe('clubAdminKpiLabels', () => {
  it('labels and hints every card clubAdminKpiGroups draws', () => {
    const labels = clubAdminKpiLabels(t);
    const cards = clubAdminKpiGroups(emptyClubAdminKpis).flatMap((group) => group.cards);
    expect(Object.keys(labels)).toHaveLength(cards.length);
    for (const card of cards) {
      expect(labels[card.key].label).toMatch(/^clubAdmin\.dashboard\.card\./);
      expect(labels[card.key].hint).toMatch(/^clubAdmin\.dashboard\.hint\./);
    }
    expect(labels.avg_rating).toEqual({
      label: 'clubAdmin.dashboard.card.avgRating',
      hint: 'clubAdmin.dashboard.hint.avgRating',
    });
  });
});

describe('the small vocabularies', () => {
  it('head every group', () => {
    expect(clubAdminGroupHeadings(t)).toEqual({
      overview: 'clubAdmin.dashboard.group.overview',
      engagement: 'clubAdmin.dashboard.group.engagement',
      community: 'clubAdmin.dashboard.group.community',
      revenue: 'clubAdmin.dashboard.group.revenue',
    });
  });

  it('name every range', () => {
    expect(clubAdminRangeLabels(t)).toEqual({
      '30d': 'clubAdmin.dashboard.ranges.last30Days',
      month: 'clubAdmin.dashboard.ranges.thisMonth',
      '12m': 'clubAdmin.dashboard.ranges.last12Months',
      all: 'clubAdmin.dashboard.ranges.allTime',
    });
  });

  it('name every trend line', () => {
    expect(clubAdminSeriesLabels(t)).toEqual({
      pods: 'clubAdmin.dashboard.series.pods',
      bookings: 'clubAdmin.dashboard.series.bookings',
      followers: 'clubAdmin.dashboard.series.followers',
      revenue: 'clubAdmin.dashboard.series.revenue',
    });
  });
});

describe('clubAdminLabels', () => {
  const labels = clubAdminLabels(t);

  it('reads every page from its own namespace', () => {
    expect(labels.dashboard.title).toBe('clubAdmin.dashboard.title');
    expect(labels.dashboard.columnRating).toBe('clubAdmin.dashboard.column.rating');
    expect(labels.clubs.yourClubs).toBe('clubAdmin.clubs.yourClubs');
    expect(labels.pods.statusFilter).toBe('clubAdmin.pods.statusFilter');
    expect(labels.monitoring.noActivity).toBe('clubAdmin.monitoring.noActivity');
    expect(labels.editClub.saved).toBe('clubAdmin.editClub.saved');
    expect(labels.editor.notFound).toBe('clubAdmin.editor.notFound');
  });

  it('fills the sentences that name something', () => {
    expect(labels.pods.deletePodConfirmBody('Sunday Long Run')).toBe(
      'clubAdmin.pods.deletePodConfirmBody(title=Sunday Long Run)',
    );
    expect(labels.pods.activity('Sunday Long Run')).toBe('clubAdmin.pods.activity(title=Sunday Long Run)');
    expect(labels.pods.aiSummary('Price raised by 40%')).toBe(
      'clubAdmin.pods.aiSummary(summary=Price raised by 40%)',
    );
    expect(labels.monitoring.changesCount(3)).toBe('clubAdmin.monitoring.changesCount(total=3)');
    expect(labels.monitoring.aiRiskChip('HIGH')).toBe('clubAdmin.monitoring.aiRiskChip(risk=HIGH)');
    expect(labels.editor.eyebrow('Koramangala Runners')).toBe(
      'clubAdmin.editor.eyebrow(club=Koramangala Runners)',
    );
  });
});
