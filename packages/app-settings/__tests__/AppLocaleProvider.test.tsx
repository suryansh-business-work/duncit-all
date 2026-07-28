// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { FlatCatalogue, Locale } from '@duncit/i18n';

const { useQueryMock, useUserDataMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useUserDataMock: vi.fn(),
}));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
  useQuery: useQueryMock,
}));

vi.mock('@duncit/user-context', () => ({ useUserData: useUserDataMock }));

// Import AFTER the mocks are registered.
const { PUBLIC_LOCALES, useTranslation } = await import('../src/useTranslation');
const { AppLocaleProvider } = await import('../src/AppLocaleProvider');

const FALLBACK: FlatCatalogue = { 'app.hello': 'Bundled hello' };

const EN: Locale = { code: 'en-IN', label: 'English', is_default: true };
const HI: Locale = { code: 'hi-IN', label: 'हिन्दी' };

function Harness() {
  const { locale, t } = useTranslation();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="hello">{t('app.hello')}</span>
    </div>
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

beforeEach(() => {
  useQueryMock.mockReset();
  useUserDataMock.mockReset();
  globalThis.localStorage.clear();
  useQueryMock.mockImplementation((document: unknown) => {
    if (document === PUBLIC_LOCALES) return { data: { publicLocales: [EN, HI] } };
    return { data: undefined };
  });
});

afterEach(() => {
  cleanup();
});

describe('AppLocaleProvider', () => {
  it("uses the signed-in account's saved language", () => {
    useUserDataMock.mockReturnValue({ user: { locale: 'hi-IN' } });
    render(
      <AppLocaleProvider fallback={FALLBACK}>
        <Harness />
      </AppLocaleProvider>,
    );

    expect(text('locale')).toBe('hi-IN');
    expect(text('hello')).toBe('Bundled hello');
  });

  it('falls back to the stored choice when the account has no saved language', () => {
    globalThis.localStorage.setItem('duncit_locale', 'hi-IN');
    useUserDataMock.mockReturnValue({ user: { full_name: 'No Locale' } });
    render(
      <AppLocaleProvider fallback={FALLBACK}>
        <Harness />
      </AppLocaleProvider>,
    );

    expect(text('locale')).toBe('hi-IN');
  });

  it('resolves the default locale when nobody is signed in', () => {
    useUserDataMock.mockReturnValue({ user: null });
    render(
      <AppLocaleProvider fallback={FALLBACK}>
        <Harness />
      </AppLocaleProvider>,
    );

    expect(useUserDataMock).toHaveBeenCalled();
    expect(text('locale')).toBe('en-IN');
  });
});
