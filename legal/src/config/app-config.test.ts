import { describe, expect, it } from 'vitest';
import { appConfig } from './app-config';

describe('Duncit Legal app config', () => {
  it('declares the expected identity', () => {
    expect(appConfig.key).toBe('legal');
    expect(appConfig.name).toBe('Legal');
    expect(appConfig.fullName).toBe('Duncit Legal');
    expect(appConfig.tokenKey).toBe('legal_token');
  });

  it('gates on the LEGAL_MANAGER role by default', () => {
    expect(appConfig.requiredRoles).toContain('LEGAL_MANAGER');
  });

  it('exposes a Welcome nav entry', () => {
    expect(appConfig.nav.some((n) => n.to === '/')).toBe(true);
  });
});
