import { afterEach, describe, expect, it, vi } from 'vitest';
import { MWEB_BUNDLE, WHATSAPP_BUNDLE, type NestedCatalogue } from '@duncit/i18n';

/** Load fallback.ts afresh over an @duncit/i18n whose mWeb / WhatsApp bundles are replaced. */
async function loadWith(bundles: { MWEB_BUNDLE: unknown; WHATSAPP_BUNDLE: unknown }) {
  vi.resetModules();
  vi.doMock('@duncit/i18n', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@duncit/i18n')>()),
    ...bundles,
  }));
  return import('../src/i18n/fallback');
}

const asNested = (value: unknown): NestedCatalogue => value as NestedCatalogue;

afterEach(() => {
  vi.doUnmock('@duncit/i18n');
  vi.resetModules();
});

describe('SHELL_FALLBACK — the profile page slices', () => {
  it('ships the mWeb branches the profile page renders, and only those', async () => {
    const { SHELL_FALLBACK, SHELL_FALLBACK_FLAT } = await import('../src/i18n/fallback');
    const mweb = asNested(asNested(MWEB_BUNDLE).mweb);

    expect(Object.keys(asNested(SHELL_FALLBACK.mweb)).sort((a, b) => a.localeCompare(b))).toEqual([
      'accountEdit',
      'auth',
      'changePassword',
      'common',
      'commPreference',
      'resetPassword',
    ]);
    expect(asNested(SHELL_FALLBACK.mweb).changePassword).toEqual(mweb.changePassword);
    expect(asNested(asNested(SHELL_FALLBACK.mweb).auth)).toEqual({ validation: asNested(mweb.auth).validation });
    expect(SHELL_FALLBACK_FLAT['mweb.common.language']).toBe(asNested(mweb.common).language);
    // The person's own WhatsApp branch rides along, the consoles' copy does not.
    expect(SHELL_FALLBACK.whatsappPreference).toEqual(asNested(WHATSAPP_BUNDLE).whatsappPreference);
  });

  it('degrades to empty branches when the bundles lack them, rather than throwing at import', async () => {
    const { SHELL_FALLBACK } = await loadWith({ MWEB_BUNDLE: { mweb: { common: {} } }, WHATSAPP_BUNDLE: undefined });

    expect(SHELL_FALLBACK.mweb).toEqual({
      common: { language: '', languageSaved: '' },
      accountEdit: {},
      changePassword: {},
      commPreference: {},
      auth: { validation: {} },
      resetPassword: { validation: {} },
    });
    expect(SHELL_FALLBACK.whatsappPreference).toEqual({});
  });

  it('treats a leaf where a branch was expected as empty', async () => {
    const { SHELL_FALLBACK } = await loadWith({
      MWEB_BUNDLE: 'not a catalogue',
      WHATSAPP_BUNDLE: { whatsappPreference: 'a leaf, not a branch' },
    });

    expect(asNested(SHELL_FALLBACK.mweb).changePassword).toEqual({});
    expect(asNested(SHELL_FALLBACK.mweb).common).toEqual({ language: '', languageSaved: '' });
    expect(SHELL_FALLBACK.whatsappPreference).toEqual({});
  });
});
