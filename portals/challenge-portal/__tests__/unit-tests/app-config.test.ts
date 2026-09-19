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

  it('exposes Dashboard + Challenges nav, then the Leaderboard group', () => {
    expect(appConfig.nav.map((n) => n.label)).toEqual(['Dashboard', 'Challenges', 'Leaderboard']);
    expect(appConfig.nav.slice(0, 2).map((n) => ('to' in n ? n.to : null))).toEqual(['/', '/challenges']);
  });

  // The Leaderboard entry is a group: it has no page of its own, only children.
  it('nests the three leaderboard pages under one group', () => {
    const group = appConfig.nav[2];
    expect('children' in group ? group.children.map((child) => child.to) : []).toEqual([
      '/leaderboard',
      '/leaderboard/points',
      '/leaderboard/settings',
    ]);
  });
});
