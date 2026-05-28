import { describe, expect, it } from 'vitest';
import { appConfig } from './app-config';

describe('Duncit Support app config', () => {
  it('declares the expected identity', () => {
    expect(appConfig.key).toBe('support');
    expect(appConfig.name).toBe('Support');
    expect(appConfig.fullName).toBe('Duncit Support');
    expect(appConfig.tokenKey).toBe('support_token');
  });

  it('gates on the SUPPORT_MANAGER role by default', () => {
    expect(appConfig.requiredRoles).toContain('SUPPORT_MANAGER');
  });

  it('exposes a Welcome nav entry', () => {
    expect(appConfig.nav.some((n) => n.to === '/')).toBe(true);
  });
});
