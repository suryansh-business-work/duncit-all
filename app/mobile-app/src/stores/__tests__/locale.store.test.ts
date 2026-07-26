import { graphqlRequest } from '@/services/graphql.client';
import { getItem, setItem } from '@/services/secure-storage';
import { useLocaleStore } from '@/stores/locale.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/services/secure-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const mockGet = getItem as jest.Mock;
const mockSet = setItem as jest.Mock;

const LOCALES = [
  { code: 'en-IN', label: 'English', is_default: true },
  { code: 'hi-IN', label: 'हिन्दी', is_rtl: false },
  { code: 'ar-AE', label: 'العربية', is_rtl: true },
];

/** graphqlRequest is called for locales first, then the catalogue. */
const mockFetches = (locales = LOCALES, entries = [{ key: 'a.b', value: 'A' }]) =>
  mockRequest
    .mockResolvedValueOnce({ publicLocales: locales })
    .mockResolvedValueOnce({ publicTranslations: entries });

beforeEach(() => {
  mockRequest.mockReset();
  mockGet.mockReset().mockResolvedValue(null);
  mockSet.mockReset().mockResolvedValue(undefined);
  useLocaleStore.setState({
    locales: [],
    catalogue: {},
    locale: 'en-IN',
    isRtl: false,
    hydrated: false,
  });
});

describe('useLocaleStore.hydrate', () => {
  it('loads locales + catalogue and honours the signed-in user language', async () => {
    mockFetches();
    await useLocaleStore.getState().hydrate('hi-IN');
    const state = useLocaleStore.getState();
    expect(state.locale).toBe('hi-IN');
    expect(state.hydrated).toBe(true);
    expect(state.catalogue).toEqual({ 'a.b': 'A' });
  });

  it('falls back to the device choice, then the platform default', async () => {
    mockGet.mockResolvedValue('ar-AE');
    mockFetches();
    await useLocaleStore.getState().hydrate(null);
    expect(useLocaleStore.getState().locale).toBe('ar-AE');
    // RTL flows straight from the resolved locale.
    expect(useLocaleStore.getState().isRtl).toBe(true);

    useLocaleStore.setState({ hydrated: false });
    mockGet.mockResolvedValue(null);
    mockRequest.mockReset();
    mockFetches();
    await useLocaleStore.getState().hydrate(null);
    expect(useLocaleStore.getState().locale).toBe('en-IN');
  });

  it('still hydrates when storage or the API is unavailable', async () => {
    mockGet.mockRejectedValue(new Error('no storage'));
    mockRequest.mockRejectedValue(new Error('offline'));
    await useLocaleStore.getState().hydrate();
    const state = useLocaleStore.getState();
    // The bundled fallback is what renders — never a crash or blank UI.
    expect(state.hydrated).toBe(true);
    expect(state.locales).toEqual([]);
    expect(state.catalogue).toEqual({});
    expect(state.locale).toBe('en-IN');
  });

  it('clears the catalogue when it cannot be fetched', async () => {
    mockRequest
      .mockResolvedValueOnce({ publicLocales: LOCALES })
      .mockRejectedValueOnce(new Error('offline'));
    await useLocaleStore.getState().hydrate('hi-IN');
    expect(useLocaleStore.getState().catalogue).toEqual({});
  });
});

describe('useLocaleStore.setLocale', () => {
  it('switches, persists and reloads the catalogue', async () => {
    mockFetches();
    await useLocaleStore.getState().hydrate('en-IN');

    mockRequest.mockResolvedValueOnce({ publicTranslations: [{ key: 'a.b', value: 'अ' }] });
    await useLocaleStore.getState().setLocale('hi-IN');

    expect(useLocaleStore.getState().locale).toBe('hi-IN');
    expect(useLocaleStore.getState().catalogue).toEqual({ 'a.b': 'अ' });
    expect(mockSet).toHaveBeenCalledWith('duncit_locale', 'hi-IN');
  });

  it('keeps the choice in memory when it cannot be persisted', async () => {
    mockFetches();
    await useLocaleStore.getState().hydrate('en-IN');
    mockSet.mockRejectedValue(new Error('no storage'));
    mockRequest.mockResolvedValueOnce({ publicTranslations: [] });
    await useLocaleStore.getState().setLocale('hi-IN');
    expect(useLocaleStore.getState().locale).toBe('hi-IN');
  });

  it('uses the requested code when the platform has no locales loaded', async () => {
    mockRequest.mockResolvedValueOnce({ publicTranslations: [] });
    await useLocaleStore.getState().setLocale('fr-FR');
    expect(useLocaleStore.getState().locale).toBe('fr-FR');
    expect(useLocaleStore.getState().isRtl).toBe(false);
  });
});
