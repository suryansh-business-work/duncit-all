import { afterEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from '../../src/config/app-config';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Duncit Support app config', () => {
  it('declares the expected identity', () => {
    expect(appConfig.key).toBe('support');
    expect(appConfig.name).toBe('Support');
    expect(appConfig.fullName).toBe('Duncit Support');
    expect(appConfig.tokenKey).toBe('support_token');
    expect(appConfig.colorModeKey).toBe('support_color_mode');
  });

  it('gates on the SUPPORT_MANAGER role by default', () => {
    expect(appConfig.requiredRoles).toEqual(['SUPPORT_MANAGER']);
  });

  it('exposes the support sections in order, groups last-but-one', () => {
    // A group header carries no `to` — fall back to its label so the shape of
    // the whole sidebar is readable in one line.
    const targets = appConfig.nav.map((n) => n.to ?? n.label);
    expect(targets).toEqual([
      '/',
      '/sos',
      '/callbacks',
      '/tickets',
      '/live-chat',
      'FAQs',
      '/mail-automation',
      'Reported Problems',
    ]);
    expect(appConfig.nav.find((n) => n.to === '/')?.label).toBe('Dashboard');
  });

  it('nests all three FAQ screens under one non-linking group', () => {
    const faqs = appConfig.nav.find((n) => n.label === 'FAQs');
    expect(faqs?.to).toBeUndefined();
    expect(faqs?.children?.map((child) => child.to)).toEqual([
      '/faqs',
      '/partners/faqs',
      '/faqs/submissions',
    ]);
    // Every child needs its own label: the sidebar keys its nodes on it, and
    // two children sharing one label would collapse into a single row.
    const labels = faqs?.children?.map((child) => child.label) ?? [];
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('honours VITE_REQUIRED_ROLES when provided', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', 'SUPPORT_USER, SUPER_ADMIN');
    vi.resetModules();
    const mod = await import('../../src/config/app-config');
    expect(mod.appConfig.requiredRoles).toEqual(['SUPPORT_USER', 'SUPER_ADMIN']);
  });
});
