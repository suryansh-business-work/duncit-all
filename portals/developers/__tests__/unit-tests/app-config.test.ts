import { describe, expect, it } from 'vitest';
import { appConfig } from '../../src/config/app-config';

describe('developers-portal appConfig', () => {
  it('is keyed for the developers console', () => {
    expect(appConfig.key).toBe('developers');
    expect(appConfig.tokenKey).toBe('developers_token');
  });

  it('defaults to the DEVELOPERS_MANAGER role', () => {
    expect(appConfig.requiredRoles).toContain('DEVELOPERS_MANAGER');
  });

  it('exposes Dashboard + API Keys + API Reference nav', () => {
    expect(appConfig.nav.map((n) => n.to)).toEqual(['/', '/keys', '/docs']);
  });
});
