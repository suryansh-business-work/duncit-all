import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { LanguageSection } from '@/components/account/LanguageSection';
import { graphqlRequest } from '@/services/graphql.client';
import { useLocaleStore } from '@/stores/locale.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const EN = { code: 'en-IN', label: 'English', english_label: 'English (India)', is_default: true };
const HI = { code: 'hi-IN', label: 'हिन्दी', english_label: 'Hindi (India)' };
const LOCALES = [EN, HI];

const seedStore = (overrides: Partial<ReturnType<typeof useLocaleStore.getState>> = {}) =>
  useLocaleStore.setState({
    locales: LOCALES,
    catalogue: {},
    locale: 'en-IN',
    isRtl: false,
    hydrated: true,
    ...overrides,
  });

beforeEach(() => {
  mockRequest.mockReset().mockResolvedValue({ publicTranslations: [] });
  seedStore();
});

describe('LanguageSection', () => {
  it('renders bundled fallback copy and every locale with its own script', () => {
    renderWithProviders(<LanguageSection />);
    // Straight from NATIVE_FALLBACK — real text with no network.
    expect(screen.getByText('Preferences')).toBeOnTheScreen();
    expect(screen.getByText('हिन्दी')).toBeOnTheScreen();
    expect(screen.getByText('Hindi (India)')).toBeOnTheScreen();
  });

  it('hides itself when the platform offers fewer than two languages', () => {
    seedStore({ locales: [EN] });
    renderWithProviders(<LanguageSection />);
    expect(screen.queryByTestId('account-language-section')).toBeNull();
  });

  it('switches language and persists it to the profile', async () => {
    renderWithProviders(<LanguageSection />);
    fireEvent.press(screen.getByTestId('locale-option-hi-IN'));

    await waitFor(() => expect(useLocaleStore.getState().locale).toBe('hi-IN'));
    // The profile write follows the UI switch, so the language changes first.
    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith(
        expect.anything(),
        { locale: 'hi-IN' },
        { auth: true },
      ),
    );
  });

  it('keeps the new language even when saving to the profile fails', async () => {
    mockRequest.mockImplementation((_doc: unknown, vars: { locale?: string }) =>
      vars?.locale
        ? Promise.reject(new Error('offline'))
        : Promise.resolve({ publicTranslations: [] }),
    );
    renderWithProviders(<LanguageSection />);
    fireEvent.press(screen.getByTestId('locale-option-hi-IN'));
    await waitFor(() => expect(useLocaleStore.getState().locale).toBe('hi-IN'));
  });

  it('ignores a tap on the language already selected', async () => {
    renderWithProviders(<LanguageSection />);
    fireEvent.press(screen.getByTestId('locale-option-en-IN'));
    await waitFor(() => expect(useLocaleStore.getState().locale).toBe('en-IN'));
    // No setMyLocale write for a no-op selection.
    const wrote = mockRequest.mock.calls.some((call) => (call[1] as { locale?: string })?.locale);
    expect(wrote).toBe(false);
  });

  it('renders a locale with no english_label', () => {
    seedStore({ locales: [EN, { code: 'ta-IN', label: 'தமிழ்' }] });
    renderWithProviders(<LanguageSection />);
    expect(screen.getByText('தமிழ்')).toBeOnTheScreen();
  });
});
