import { describe, expect, it } from 'vitest';
import { appConfig } from '../../src/config/app-config';

describe('challenge-portal appConfig', () => {
  it('is keyed for the challenges console', () => {
    expect(appConfig.key).toBe('challenge');
    expect(appConfig.tokenKey).toBe('challenge_token');
  });

  it('defaults to the CHALLENGE_MANAGER role', () => {
    expect(appConfig.requiredRoles).toContain('CHALLENGE_MANAGER');
  });

  // Flat entries first, one per engine screen, each with its own route.
  it('exposes the engine screens in order, then the Leaderboard group', () => {
    expect(appConfig.nav.map((n) => n.label)).toEqual([
      'Dashboard',
      'Tool Master',
      'Tool Presets',
      'Category Mapping',
      'Challenge Templates',
      'Pod Challenges',
      'Live Challenge Monitor',
      'Results & Leaderboards',
      'Notifications',
      'Audit Logs',
      'Leaderboard',
    ]);
    expect(appConfig.nav.slice(0, -1).map((n) => ('to' in n ? n.to : null))).toEqual([
      '/',
      '/tools',
      '/tools/presets',
      '/category-mapping',
      '/challenges',
      '/pod-challenges',
      '/live',
      '/results',
      '/notifications',
      '/audit-logs',
    ]);
  });

  it('gives every entry a translation key', () => {
    for (const entry of appConfig.nav) expect(entry.labelKey).toMatch(/^shell\.nav\.\w+$/);
  });

  // The Leaderboard entry is a group: it has no page of its own, only children.
  it('nests the three leaderboard pages under one group, last', () => {
    const group = appConfig.nav[appConfig.nav.length - 1];
    expect('to' in group).toBe(false);
    expect('children' in group ? group.children.map((child) => child.to) : []).toEqual([
      '/leaderboard',
      '/leaderboard/points',
      '/leaderboard/settings',
    ]);
  });
});
