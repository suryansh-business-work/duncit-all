import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import {
  LANGUAGE_PREFERENCE_FLAG,
  LocaleProvider,
  PUBLIC_LOCALES,
  PUBLIC_TRANSLATIONS,
} from '@duncit/app-settings';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LanguageSection from '../LanguageSection';
import { MWEB_FALLBACK_FLAT } from '../../../i18n/fallback';

// The section only shows while the language_preference flag is on; the flag
// set is the server's, so each test decides which flags it sees.
let enabledFlags = new Set<string>([LANGUAGE_PREFERENCE_FLAG]);
vi.mock('../../../hooks/useFeatureFlag', () => ({
  useFeatureFlag: (key: string) => enabledFlags.has(key),
}));

afterEach(() => {
  enabledFlags = new Set([LANGUAGE_PREFERENCE_FLAG]);
});

const localesMock: MockedResponse = {
  request: { query: PUBLIC_LOCALES },
  result: {
    data: {
      publicLocales: [
        { code: 'en-IN', label: 'English', english_label: 'English (India)', is_rtl: false, is_default: true, sort_order: 0 },
        { code: 'hi-IN', label: 'हिन्दी', english_label: 'Hindi (India)', is_rtl: false, is_default: false, sort_order: 1 },
      ],
    },
  },
};

const catalogueMock = (locale: string, entries: { key: string; value: string }[]): MockedResponse => ({
  request: { query: PUBLIC_TRANSLATIONS, variables: { locale } },
  result: { data: { publicTranslations: entries } },
  maxUsageCount: 5,
});

function renderSection(mocks: MockedResponse[]) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <LocaleProvider fallback={MWEB_FALLBACK_FLAT} userLocale="en-IN">
        <LanguageSection />
      </LocaleProvider>
    </MockedProvider>,
  );
}

describe('LanguageSection', () => {
  it('renders the bundled fallback text before the server catalogue arrives', async () => {
    renderSection([localesMock, catalogueMock('en-IN', [])]);
    // Straight from MWEB_FALLBACK — no network needed for real copy.
    expect(await screen.findByText('Preferences')).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
  });

  it('stays hidden while the language preference flag is off', async () => {
    enabledFlags = new Set();
    renderSection([localesMock, catalogueMock('en-IN', [])]);
    // Wait for the locale list to land so the hide is down to the flag alone.
    await waitFor(() => expect(document.documentElement.lang).toBe('en-IN'));
    expect(screen.queryByTestId('account-language-section')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Language')).not.toBeInTheDocument();
  });

  it('prefers the server translation over the bundled fallback', async () => {
    renderSection([
      localesMock,
      catalogueMock('en-IN', [{ key: 'mweb.account.preferences', value: 'My preferences' }]),
    ]);
    expect(await screen.findByText('My preferences')).toBeInTheDocument();
  });

  it('lists every active locale with its own script and English name', async () => {
    renderSection([localesMock, catalogueMock('en-IN', [])]);
    fireEvent.mouseDown(await screen.findByLabelText('Language'));
    // The endonym sits in its own lang-tagged span, so match the whole option.
    const hindi = await screen.findByTestId('locale-option-hi-IN');
    expect(hindi).toHaveTextContent('हिन्दी · Hindi (India)');
    expect(screen.getByText('हिन्दी')).toHaveAttribute('lang', 'hi-IN');
    expect(screen.getByTestId('locale-option-en-IN')).toHaveTextContent('English · English (India)');
  });

  it('re-renders in the chosen language straight away', async () => {
    renderSection([
      localesMock,
      catalogueMock('en-IN', []),
      catalogueMock('hi-IN', [{ key: 'mweb.account.preferences', value: 'मेरी प्राथमिकताएँ' }]),
    ]);
    fireEvent.mouseDown(await screen.findByLabelText('Language'));
    fireEvent.click(await screen.findByText(/हिन्दी/));

    // The UI swaps catalogues immediately — it does not wait on the profile
    // write, so the language changes even if that request is slow or fails.
    await waitFor(() => expect(screen.getByText('मेरी प्राथमिकताएँ')).toBeInTheDocument());
  });

  it('flips the document direction for a right-to-left locale', async () => {
    const rtlLocales: MockedResponse = {
      request: { query: PUBLIC_LOCALES },
      result: {
        data: {
          publicLocales: [
            { code: 'en-IN', label: 'English', english_label: 'English (India)', is_rtl: false, is_default: true, sort_order: 0 },
            { code: 'ar-AE', label: 'العربية', english_label: 'Arabic (UAE)', is_rtl: true, is_default: false, sort_order: 1 },
          ],
        },
      },
    };
    renderSection([rtlLocales, catalogueMock('en-IN', []), catalogueMock('ar-AE', [])]);

    await waitFor(() => expect(document.documentElement.dir).toBe('ltr'));
    expect(document.documentElement.lang).toBe('en-IN');

    fireEvent.mouseDown(await screen.findByLabelText('Language'));
    fireEvent.click(await screen.findByText(/العربية/));

    // Marking a locale RTL in Admin is meaningless unless the layout flips.
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'));
    expect(document.documentElement.lang).toBe('ar-AE');
  });
});
