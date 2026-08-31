// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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

const STORAGE_KEY = 'duncit_locale';

const FALLBACK: FlatCatalogue = {
  'app.hello': 'Bundled hello',
  'app.bye': 'Bundled bye',
};

const EN: Locale = { code: 'en-IN', label: 'English', is_default: true };
const HI: Locale = { code: 'hi-IN', label: 'हिन्दी', is_rtl: null };
const AR: Locale = { code: 'ar-AE', label: 'العربية', is_rtl: true };

type Row = { key: string; value: string };

interface Wiring {
  locales?: Locale[];
  translations?: Row[];
}

/** Last options object each query was called with, for skip/variables assertions. */
let translationsCall: { variables?: { locale: string }; skip?: boolean } | undefined;

function wire({ locales, translations }: Wiring = {}) {
  translationsCall = undefined;
  useQueryMock.mockImplementation((document: unknown, options: Record<string, unknown>) => {
    if (document === PUBLIC_LOCALES) {
      return { data: locales ? { publicLocales: locales } : undefined };
    }
    if (document !== PUBLIC_TRANSLATIONS) throw new Error('unexpected query');
    translationsCall = options as typeof translationsCall;
    if (options.skip === true) return { data: undefined };
    return { data: translations ? { publicTranslations: translations } : undefined };
  });
}

function Harness() {
  const { t, has, locale, isRtl, locales, setLocale } = useTranslation();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="rtl">{String(isRtl)}</span>
      <span data-testid="codes">{locales.map((l) => l.code).join(',')}</span>
      <span data-testid="hello">{t('app.hello')}</span>
      <span data-testid="has">{String(has('app.hello'))}</span>
      <button type="button" onClick={() => setLocale('hi-IN')}>
        switch
      </button>
    </div>
  );
}

function BundleHarness() {
  const { t, has } = useTranslation(FALLBACK);
  return (
    <div>
      <span data-testid="hello">{t('app.hello')}</span>
      <span data-testid="has">{String(has('app.hello'))}</span>
    </div>
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

function renderProvider(props: {
  userLocale?: string | null;
  onLocaleChange?: (code: string) => void;
}) {
  return render(
    <LocaleProvider fallback={FALLBACK} {...props}>
      <Harness />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  useQueryMock.mockReset();
  globalThis.localStorage.clear();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('lang');
  wire();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LocaleProvider — locale resolution', () => {
  it('renders bundled copy and the platform default code before the API answers', () => {
    renderProvider({});

    expect(text('locale')).toBe('en-IN');
    expect(text('codes')).toBe('');
    expect(text('hello')).toBe('Bundled hello');
    expect(text('has')).toBe('true');
    // Nothing to fetch until the platform has told us which locales exist.
    expect(translationsCall?.skip).toBe(true);
  });

  it('fetches the catalogue for the resolved code and lets server text win', () => {
    wire({ locales: [EN, HI], translations: [{ key: 'app.hello', value: 'Server hello' }] });
    renderProvider({});

    expect(text('locale')).toBe('en-IN');
    expect(text('codes')).toBe('en-IN,hi-IN');
    expect(text('hello')).toBe('Server hello');
    expect(translationsCall?.skip).toBe(false);
    expect(translationsCall?.variables).toEqual({ locale: 'en-IN' });
  });

  it('keeps bundled copy when the catalogue query has not resolved yet', () => {
    wire({ locales: [EN, HI] });
    renderProvider({});

    expect(text('hello')).toBe('Bundled hello');
    expect(translationsCall?.skip).toBe(false);
  });

  it("prefers the signed-in account's saved language over the stored choice", () => {
    globalThis.localStorage.setItem(STORAGE_KEY, 'hi-IN');
    wire({ locales: [EN, HI] });
    renderProvider({ userLocale: 'en-IN' });

    expect(text('locale')).toBe('en-IN');
  });

  it('falls back to the locale stored in this browser', () => {
    globalThis.localStorage.setItem(STORAGE_KEY, 'hi-IN');
    wire({ locales: [EN, HI] });
    renderProvider({ userLocale: null });

    expect(text('locale')).toBe('hi-IN');
  });

  it('falls back to the device language when nothing is stored', () => {
    wire({ locales: [EN, HI] });
    vi.stubGlobal('navigator', { language: 'hi-IN' });
    renderProvider({});

    expect(text('locale')).toBe('hi-IN');
  });

  it('falls back to the default locale on a host with no navigator', () => {
    wire({ locales: [HI, EN] });
    vi.stubGlobal('navigator', undefined);
    renderProvider({});

    expect(text('locale')).toBe('en-IN');
  });
});

describe('LocaleProvider — document direction', () => {
  it('marks the document ltr and stamps the language for a left-to-right locale', () => {
    wire({ locales: [EN, HI] });
    renderProvider({});

    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en-IN');
    expect(text('rtl')).toBe('false');
  });

  it('flips the document to rtl for a locale the admin marked right-to-left', () => {
    wire({ locales: [EN, AR] });
    renderProvider({ userLocale: 'ar-AE' });

    expect(text('rtl')).toBe('true');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar-AE');
  });

  it('leaves a locale with a null is_rtl flag left-to-right', () => {
    wire({ locales: [EN, HI] });
    renderProvider({ userLocale: 'hi-IN' });

    expect(text('rtl')).toBe('false');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('no-ops on a host whose document has no documentElement', () => {
    wire({ locales: [EN, HI] });
    // Shadow the prototype getter on the instance, then delete it so the real
    // getter is restored for the rest of the suite.
    Object.defineProperty(document, 'documentElement', {
      configurable: true,
      get: () => undefined,
    });
    try {
      renderProvider({});
      expect(text('locale')).toBe('en-IN');
    } finally {
      delete (document as unknown as { documentElement?: unknown }).documentElement;
    }
    // The effect bailed out, so nothing was stamped on the real root element.
    expect(document.documentElement.dir).toBe('');
    expect(document.documentElement.lang).toBe('');
  });
});

describe('LocaleProvider — switching', () => {
  it('applies the choice instantly, persists it and reports it upwards', () => {
    const onLocaleChange = vi.fn();
    wire({ locales: [EN, HI] });
    renderProvider({ userLocale: 'en-IN', onLocaleChange });

    expect(text('locale')).toBe('en-IN');
    fireEvent.click(screen.getByRole('button', { name: 'switch' }));

    expect(text('locale')).toBe('hi-IN');
    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBe('hi-IN');
    expect(onLocaleChange).toHaveBeenCalledWith('hi-IN');
  });

  it('switches without an onLocaleChange listener', () => {
    wire({ locales: [EN, HI] });
    renderProvider({});

    fireEvent.click(screen.getByRole('button', { name: 'switch' }));
    expect(text('locale')).toBe('hi-IN');
    expect(document.documentElement.lang).toBe('hi-IN');
  });
});

describe('LocaleProvider — unusable storage', () => {
  it('renders when reading storage throws (private mode)', () => {
    wire({ locales: [EN, HI] });
    vi.spyOn(globalThis.Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    try {
      renderProvider({});
      expect(text('locale')).toBe('en-IN');
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('still switches when writing to storage throws', () => {
    const onLocaleChange = vi.fn();
    wire({ locales: [EN, HI] });
    vi.spyOn(globalThis.Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    try {
      renderProvider({ onLocaleChange });
      fireEvent.click(screen.getByRole('button', { name: 'switch' }));
      expect(text('locale')).toBe('hi-IN');
      expect(onLocaleChange).toHaveBeenCalledWith('hi-IN');
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('renders and switches on a host with no localStorage at all', () => {
    wire({ locales: [EN, HI] });
    vi.stubGlobal('localStorage', undefined);
    renderProvider({});

    expect(text('locale')).toBe('en-IN');
    fireEvent.click(screen.getByRole('button', { name: 'switch' }));
    expect(text('locale')).toBe('hi-IN');
  });
});

describe('useTranslation — outside a provider', () => {
  it('returns a working translator with no catalogue', () => {
    render(<Harness />);

    expect(text('locale')).toBe('en-IN');
    expect(text('rtl')).toBe('false');
    expect(text('codes')).toBe('');
    // No catalogue anywhere, so the key itself is rendered — never blank.
    expect(text('hello')).toBe('app.hello');
    expect(text('has')).toBe('false');
  });

  it('setLocale is an inert no-op outside a provider', () => {
    render(<Harness />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'switch' }));
    });
    expect(text('locale')).toBe('en-IN');
    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("renders the surface's bundled copy when a fallback catalogue is passed", () => {
    render(<BundleHarness />);

    expect(text('hello')).toBe('Bundled hello');
    expect(text('has')).toBe('true');
  });
});
