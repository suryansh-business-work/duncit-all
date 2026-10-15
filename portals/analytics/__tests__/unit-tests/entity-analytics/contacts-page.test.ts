import { describe, expect, it } from 'vitest';
import { createTranslator } from '@duncit/app-settings';
import {
  ANALYTICS_PAGES,
  COMMUNICATIONS_PAGE,
  CONTACTS_PAGE,
} from '../../../src/pages/entity-analytics/pages';
import { CONTACTS_COPY } from '../../../src/pages/entity-analytics/platform-copy/contacts';
import { PLATFORM_COPY } from '../../../src/pages/entity-analytics/platform-copy';
import {
  BREAKDOWN_COPY,
  COLUMN_COPY,
  KPI_COPY,
  LEADERBOARD_COPY,
  TREND_COPY,
} from '../../../src/pages/entity-analytics/copy';
import { sliceLabel } from '../../../src/pages/entity-analytics/slice-label';
import { COPY } from '../../mocks/analytics';

const { t } = createTranslator({ locale: 'en-IN', fallback: COPY });

/** Every translation key a value tree names, however deeply nested. */
const keysIn = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(keysIn);
  return [];
};

describe('Contacts and Communications page specs', () => {
  it('describes Growth > Contacts, with a standing data-protection note', () => {
    expect(CONTACTS_PAGE).toEqual({
      path: '/growth/contacts',
      entity: 'CONTACTS',
      title: 'analytics.page.contacts.title',
      subtitle: 'analytics.page.contacts.subtitle',
      dashboardId: 'analytics.contacts',
      note: 'analytics.page.contacts.note',
    });
  });

  it('describes Growth > Communications, which carries no note', () => {
    expect(COMMUNICATIONS_PAGE).toEqual({
      path: '/growth/communications',
      entity: 'COMMUNICATIONS',
      title: 'analytics.page.communications.title',
      subtitle: 'analytics.page.communications.subtitle',
      dashboardId: 'analytics.communications',
    });
  });

  it('mounts the very same specs in the console, Contacts between Marketing and Communications', () => {
    // The other consoles mount these exported objects, so the layout id they
    // save under must be the one this console saves under.
    const paths = ANALYTICS_PAGES.map((page) => page.path);
    const marketing = paths.indexOf('/growth/marketing');
    expect(ANALYTICS_PAGES[marketing + 1]).toBe(CONTACTS_PAGE);
    expect(ANALYTICS_PAGES[marketing + 2]).toBe(COMMUNICATIONS_PAGE);
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(ANALYTICS_PAGES.map((page) => page.dashboardId)).size).toBe(ANALYTICS_PAGES.length);
  });

  it('ships words for the title, subtitle and note', () => {
    for (const key of [CONTACTS_PAGE.title, CONTACTS_PAGE.subtitle, CONTACTS_PAGE.note]) {
      expect(COPY[key as string], key).toBeTruthy();
    }
    expect(COPY['analytics.page.contacts.note']).toMatch(/counts only/);
  });
});

describe('Contacts page copy', () => {
  it('ships an English string for every key it names', () => {
    const missing = keysIn(CONTACTS_COPY).filter((key) => !COPY[key]);
    expect(missing).toEqual([]);
  });

  it('prefixes every server key with ctc_, so no other page can claim it', () => {
    const serverKeys = [
      ...Object.keys(CONTACTS_COPY.kpis),
      ...Object.keys(CONTACTS_COPY.trends),
      ...Object.keys(CONTACTS_COPY.breakdowns),
      ...Object.keys(CONTACTS_COPY.leaderboards),
      ...Object.keys(CONTACTS_COPY.columns),
    ];
    expect(serverKeys.length).toBeGreaterThan(0);
    expect(serverKeys.every((key) => key.startsWith('ctc_'))).toBe(true);
  });

  it('is folded into the console lookups the widgets read', () => {
    expect(PLATFORM_COPY.kpis.ctc_match_rate).toBe(CONTACTS_COPY.kpis.ctc_match_rate);
    expect(t(KPI_COPY.ctc_syncing_members?.title ?? '')).toBe(COPY['analytics.kpi.ctcSyncingMembers']);
    expect(TREND_COPY.ctc_invites).toEqual(CONTACTS_COPY.trends.ctc_invites);
    expect(BREAKDOWN_COPY.ctc_phone_book_size).toBe('analytics.breakdown.ctcPhoneBookSize');
    expect(LEADERBOARD_COPY.ctc_top_members?.name).toBe('analytics.leaderboard.ctcMember');
    expect(COLUMN_COPY.ctc_days_since_sync).toBe('analytics.leaderboard.ctcDaysSinceSync');
  });

  it('names the phone-book size and found-per-member buckets', () => {
    const context = { t, formatClock: (value: string) => value, locale: 'en-IN' };
    const slice = (key: string) => ({ key, label: null, value: 4 });

    expect(sliceLabel('ctc_phone_book_size', slice('book_1_49'), context)).toBe(
      COPY['analytics.slice.ctcBook1To49']
    );
    expect(sliceLabel('ctc_found_per_member', slice('found_50_plus'), context)).toBe(
      COPY['analytics.slice.ctcFound50Plus']
    );
    // Invite outcomes reuse the log words, so SENT reads the same everywhere.
    expect(sliceLabel('ctc_invite_outcomes', slice('SENT'), context)).toBe(COPY['analytics.slice.logSent']);
  });
});
