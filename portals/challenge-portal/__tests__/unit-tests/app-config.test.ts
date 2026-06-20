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

  it('exposes Dashboard + Challenges nav', () => {
    expect(appConfig.nav.map((n) => n.to)).toEqual(['/', '/challenges']);
  });
});
