import { describe, expect, it } from 'vitest';
import { appConfig } from './app-config';

describe('Duncit Marketing app config', () => {
  it('declares the expected identity', () => {
    expect(appConfig.key).toBe('marketing');
    expect(appConfig.name).toBe('Marketing');
    expect(appConfig.fullName).toBe('Duncit Marketing');
    expect(appConfig.tokenKey).toBe('marketing_token');
  });

  it('gates on the MARKETING_MANAGER role by default', () => {
    expect(appConfig.requiredRoles).toContain('MARKETING_MANAGER');
  });

  it('exposes the campaign and notification nav entries', () => {
    const targets = appConfig.nav.map((n) => n.to);
    expect(targets).toEqual(
      expect.arrayContaining(['/', '/campaigns/email', '/campaigns/whatsapp', '/notifications']),
    );
  });
});
