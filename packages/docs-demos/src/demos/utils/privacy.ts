import {
  consentAllows,
  consentCookieDomain,
  consentHeaderValue,
  makeConsent,
  parseConsent,
  serializeConsent,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

export const privacyDemos: PackageDemo[] = [
  defineDemo<{ analytics: boolean; marketing: boolean; decidedAt: string; host: string }>({
    id: 'tracking-consent',
    title: 'What a visitor allowed, and what the server is told',
    note:
      'Turn marketing off: the x-consent header drops it and consentAllows(…, "marketing") goes false, so no click id is kept. Move decidedAt back more than a year and the stored choice reads as null — the banner asks again. A host outside duncit.com keeps a host-only cookie.',
    mock: {
      analytics: true,
      marketing: false,
      decidedAt: '2026-10-02T09:30:00.000Z',
      host: 'mweb.duncit.com',
    },
    compute: (mock) => {
      const choice = makeConsent(
        { analytics: mock.analytics, marketing: mock.marketing },
        new Date(mock.decidedAt)
      );
      const stored = serializeConsent(choice);
      return {
        'x-consent header': consentHeaderValue(choice),
        'analytics allowed': consentAllows(choice, 'analytics'),
        'marketing allowed': consentAllows(choice, 'marketing'),
        'read back today': parseConsent(stored),
        'cookie domain': consentCookieDomain(mock.host) ?? 'host-only',
      };
    },
  }),
];
