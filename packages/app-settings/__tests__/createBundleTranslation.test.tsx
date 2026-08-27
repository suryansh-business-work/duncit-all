// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { FlatCatalogue, Locale, NestedCatalogue } from '@duncit/i18n';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
  useQuery: useQueryMock,
}));

// Import AFTER the mock is registered.
const { LocaleProvider, PUBLIC_LOCALES, PUBLIC_TRANSLATIONS, createBundleTranslation } =
  await import('../src/useTranslation');

const EN: Locale = { code: 'en-IN', label: 'English', is_default: true };

/** A package-owned namespace, the way @duncit/host-pod-actions ships one. */
const BUNDLE: NestedCatalogue = {
  partners: {
    attendance: {
      title: 'Mark Attendance',
      note: 'An unmarked attendee is a seat left out of your payout',
    },
  },
};

/** The host surface's own bundle, deliberately WITHOUT the package keys. */
const SURFACE_FALLBACK: FlatCatalogue = { 'app.hello': 'Bundled hello' };

type Row = { key: string; value: string };

function wire(translations?: Row[]) {
  useQueryMock.mockImplementation((document: unknown, options: Record<string, unknown>) => {
    if (document === PUBLIC_LOCALES) return { data: { publicLocales: [EN] } };
    if (document !== PUBLIC_TRANSLATIONS) throw new Error('unexpected query');
    if (options.skip === true) return { data: undefined };
    return { data: translations ? { publicTranslations: translations } : undefined };
  });
}

const usePartnersTranslation = createBundleTranslation(BUNDLE);

function Harness() {
  const { t, has, locale } = usePartnersTranslation();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="title">{t('partners.attendance.title')}</span>
      <span data-testid="hello">{t('app.hello')}</span>
      <span data-testid="missing">{t('partners.attendance.ghost')}</span>
      <span data-testid="has-title">{String(has('partners.attendance.title'))}</span>
      <span data-testid="has-hello">{String(has('app.hello'))}</span>
      <span data-testid="has-missing">{String(has('partners.attendance.ghost'))}</span>
    </div>
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

beforeEach(() => {
  useQueryMock.mockReset();
  globalThis.localStorage.clear();
  wire();
});

afterEach(() => {
  cleanup();
});

describe('createBundleTranslation', () => {
  it('answers its own keys from the package bundle outside any provider', () => {
    render(<Harness />);
    expect(text('title')).toBe('Mark Attendance');
    expect(text('has-title')).toBe('true');
    expect(text('missing')).toBe('partners.attendance.ghost');
    expect(text('has-missing')).toBe('false');
  });

  it('layers the package bundle UNDER a provider that never mounted its namespace', () => {
    render(
      <LocaleProvider fallback={SURFACE_FALLBACK}>
        <Harness />
      </LocaleProvider>,
    );
    // The provider answers its own keys.
    expect(text('hello')).toBe('Bundled hello');
    expect(text('has-hello')).toBe('true');
    // The package bundle answers the keys the provider has never heard of.
    expect(text('title')).toBe('Mark Attendance');
    expect(text('has-title')).toBe('true');
    // A key neither knows still echoes rather than crashing.
    expect(text('missing')).toBe('partners.attendance.ghost');
    expect(text('has-missing')).toBe('false');
    expect(text('locale')).toBe('en-IN');
  });

  it('lets translated provider copy win over the bundled fallback', () => {
    wire([{ key: 'partners.attendance.title', value: 'Attendance (server copy)' }]);
    render(
      <LocaleProvider fallback={SURFACE_FALLBACK}>
        <Harness />
      </LocaleProvider>,
    );
    expect(text('title')).toBe('Attendance (server copy)');
    expect(text('has-title')).toBe('true');
  });
});
