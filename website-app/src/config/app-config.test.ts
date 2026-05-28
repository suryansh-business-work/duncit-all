import { describe, expect, it } from 'vitest';
import { appConfig } from './app-config';

describe('Duncit Website app config', () => {
  it('declares the expected identity', () => {
    expect(appConfig.key).toBe('website-app');
    expect(appConfig.name).toBe('Website');
    expect(appConfig.fullName).toBe('Duncit Website');
    expect(appConfig.tokenKey).toBe('website_app_token');
  });

  it('gates on the WEBSITE_MANAGER role by default', () => {
    expect(appConfig.requiredRoles).toContain('WEBSITE_MANAGER');
  });

  it('exposes a Welcome nav entry', () => {
    expect(appConfig.nav.some((n) => n.to === '/')).toBe(true);
  });
});
