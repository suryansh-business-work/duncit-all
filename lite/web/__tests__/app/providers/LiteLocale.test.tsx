import type { MockedResponse } from '@apollo/client/testing';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PUBLIC_LOCALES, PUBLIC_TRANSLATIONS } from '@duncit/app-settings';
import { LITE_SET_MY_LOCALE } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { LiteLocale } from '../../../app/providers/LiteLocale';
import { captureNotifications, meFixture, renderWithProviders, typed } from '../../test-utils';

const locale = (code: string, label: string, isDefault: boolean) =>
  typed('PublicLocale', { code, label, english_label: label, is_rtl: false, is_default: isDefault, sort_order: isDefault ? 0 : 1 });

const localesMock: MockedResponse = {
  request: { query: PUBLIC_LOCALES },
  result: { data: { publicLocales: [locale('en-IN', 'English', true), locale('hi-IN', 'हिन्दी', false)] } },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const translationsMock = (code: string, discover: string): MockedResponse => ({
  request: { query: PUBLIC_TRANSLATIONS, variables: { locale: code } },
  result: { data: { publicTranslations: [typed('PublicTranslation', { key: 'liteWeb.nav.discover', value: discover })] } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const baseMocks = [localesMock, translationsMock('en-IN', 'Discover'), translationsMock('hi-IN', 'खोजें')];

/** A word in the active language, and the switcher a reader would use. */
function LanguageProbe() {
  const { t, locale: active, setLocale } = useWebT();
  return (
    <>
      <p data-testid="word">{t('liteWeb.nav.discover')}</p>
      <p data-testid="locale">{active}</p>
      <button type="button" onClick={() => setLocale('hi-IN')}>
        Hindi
      </button>
    </>
  );
}

const page = (
  <LiteLocale>
    <LanguageProbe />
  </LiteLocale>
);

let toasts: ReturnType<typeof captureNotifications>;

beforeEach(() => {
  localStorage.clear();
  toasts = captureNotifications();
});

afterEach(() => {
  toasts.stop();
  localStorage.clear();
});

describe('LiteLocale', () => {
  it('renders the bundled English copy before the server answers', () => {
    renderWithProviders(page, { mocks: baseMocks });
    expect(screen.getByTestId('word')).toHaveTextContent('Discover');
  });

  it("uses the account's saved language over the browser's", async () => {
    renderWithProviders(page, { me: meFixture({ locale: 'hi-IN' }), mocks: baseMocks });
    await waitFor(() => expect(screen.getByTestId('word')).toHaveTextContent('खोजें'));
    expect(screen.getByTestId('locale')).toHaveTextContent('hi-IN');
  });

  it("switches a visitor's language on this device without saving it anywhere else", async () => {
    const saved = vi.fn(() => ({ data: { liteSetMyLocale: typed('LiteUser', { id: 'u-1', locale: 'hi-IN' }) } }));
    const { user } = renderWithProviders(page, { mocks: [...baseMocks, { request: { query: LITE_SET_MY_LOCALE, variables: { locale: 'hi-IN' } }, result: saved }] });
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('en-IN'));

    await user.click(screen.getByRole('button', { name: 'Hindi' }));

    await waitFor(() => expect(screen.getByTestId('word')).toHaveTextContent('खोजें'));
    expect(saved).not.toHaveBeenCalled();
  });

  it("saves a signed-in reader's switch to the account", async () => {
    const saved = vi.fn(() => ({ data: { liteSetMyLocale: typed('LiteUser', { id: 'u-1', locale: 'hi-IN' }) } }));
    const { user } = renderWithProviders(page, {
      me: meFixture(),
      mocks: [...baseMocks, { request: { query: LITE_SET_MY_LOCALE, variables: { locale: 'hi-IN' } }, result: saved }],
    });

    await user.click(screen.getByRole('button', { name: 'Hindi' }));

    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(toasts.seen).toEqual([]);
  });

  it('keeps the new language and says why when the account cannot be updated', async () => {
    const { user } = renderWithProviders(page, {
      me: meFixture(),
      mocks: [...baseMocks, { request: { query: LITE_SET_MY_LOCALE, variables: { locale: 'hi-IN' } }, result: { errors: [{ message: 'Language not available' }] } }],
    });

    await user.click(screen.getByRole('button', { name: 'Hindi' }));

    await waitFor(() => expect(toasts.seen).toEqual([{ message: 'Language not available', severity: 'error' }]));
    expect(screen.getByTestId('locale')).toHaveTextContent('hi-IN');
  });
});
