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

  it('exposes the website management nav entries', () => {
    const targets = appConfig.nav.map((n) => n.to);
    expect(targets).toEqual(
      expect.arrayContaining([
        '/',
        '/careers',
        '/newsroom',
        '/blog',
        '/newsletter',
        '/contact-submissions',
        '/faq-submissions',
      ]),
    );
  });
});
