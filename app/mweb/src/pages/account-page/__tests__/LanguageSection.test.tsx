import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { LocaleProvider, PUBLIC_LOCALES, PUBLIC_TRANSLATIONS } from '@duncit/app-settings';
import { describe, expect, it } from 'vitest';
import LanguageSection from '../LanguageSection';
import { MWEB_FALLBACK_FLAT } from '../../../i18n/fallback';

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
    <MockedProvider mocks={mocks} addTypename={false}>
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
    expect(await screen.findByText(/हिन्दी · Hindi \(India\)/)).toBeInTheDocument();
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
