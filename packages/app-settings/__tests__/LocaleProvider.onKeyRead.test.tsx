// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { FlatCatalogue, Locale } from '@duncit/i18n';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: useQueryMock,
}));

// Import AFTER the mock is registered.
const { LocaleProvider, PUBLIC_LOCALES, PUBLIC_TRANSLATIONS, useTranslation } = await import(
  '../src/useTranslation'
);

const EN: Locale = { code: 'en-IN', label: 'English', is_default: true };

const FALLBACK: FlatCatalogue = {
  'app.hello': 'Bundled hello',
  'app.items.one': '{count} item',
  'app.items.other': '{count} items',
};

function Harness() {
  const { t, has } = useTranslation();
  return (
    <div>
      <span data-testid="hello">{t('app.hello')}</span>
      <span data-testid="items">{t('app.items', { count: 3 })}</span>
      <span data-testid="ghost">{t('app.ghost')}</span>
      <span data-testid="has-hello">{String(has('app.hello'))}</span>
      <span data-testid="has-ghost">{String(has('app.ghost'))}</span>
    </div>
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

beforeEach(() => {
  useQueryMock.mockReset();
  globalThis.localStorage.clear();
  useQueryMock.mockImplementation((document: unknown, options: Record<string, unknown>) => {
    if (document === PUBLIC_LOCALES) return { data: { publicLocales: [EN] } };
    if (document !== PUBLIC_TRANSLATIONS) throw new Error('unexpected query');
    if (options.skip === true) return { data: undefined };
    return { data: { publicTranslations: [{ key: 'app.hello', value: 'Server hello' }] } };
  });
});

afterEach(() => {
  cleanup();
});

describe('LocaleProvider — onKeyRead', () => {
  it('reports every key the page looks up, found or not, through t and has', () => {
    const read = vi.fn<(key: string) => void>();
    render(
      <LocaleProvider fallback={FALLBACK} onKeyRead={read}>
        <Harness />
      </LocaleProvider>,
    );

    expect(text('hello')).toBe('Server hello');
    expect(text('items')).toBe('3 items');
    expect(text('ghost')).toBe('app.ghost');
    expect(text('has-hello')).toBe('true');
    expect(text('has-ghost')).toBe('false');
    // A plural is reported under its base key; the server render keeps the .one / .other rows beneath it.
    expect(new Set(read.mock.calls.map(([key]) => key))).toEqual(new Set(['app.hello', 'app.items', 'app.ghost']));
  });

  it('draws exactly the copy it draws without a listener', () => {
    const { container: plain } = render(
      <LocaleProvider fallback={FALLBACK}>
        <Harness />
      </LocaleProvider>,
    );
    const withoutListener = plain.innerHTML;
    cleanup();

    const { container: reporting } = render(
      <LocaleProvider fallback={FALLBACK} onKeyRead={vi.fn()}>
        <Harness />
      </LocaleProvider>,
    );
    expect(reporting.innerHTML).toBe(withoutListener);
  });
});
