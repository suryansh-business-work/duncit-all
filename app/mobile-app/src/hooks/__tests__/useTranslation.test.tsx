import { renderHook, waitFor } from '@testing-library/react-native';

import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleStore } from '@/stores/locale.store';
import { useMeStore } from '@/stores/me.store';

const hydrate = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  hydrate.mockClear();
  useLocaleStore.setState({
    locales: [],
    catalogue: {},
    locale: 'en-IN',
    isRtl: false,
    hydrated: true,
    appliedUserLocale: null,
    hydrate,
  });
  useMeStore.setState({ data: undefined } as never);
});

describe('useTranslation', () => {
  it('renders the bundled fallback when the server has no catalogue', () => {
    const { result } = renderHook(() => useTranslation());
    // Real copy with no network — straight from NATIVE_FALLBACK.
    expect(result.current.t('mweb.account.preferences')).toBe('Preferences');
    expect(result.current.locale).toBe('en-IN');
  });

  it('prefers server text over the bundled fallback', () => {
    useLocaleStore.setState({ catalogue: { 'mweb.account.preferences': 'My prefs' } });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('mweb.account.preferences')).toBe('My prefs');
  });

  it('renders the key itself for a string nobody has defined', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('nope.not.here')).toBe('nope.not.here');
    expect(result.current.has('nope.not.here')).toBe(false);
  });

  it('hydrates once on first use', async () => {
    useLocaleStore.setState({ hydrated: false });
    renderHook(() => useTranslation());
    await waitFor(() => expect(hydrate).toHaveBeenCalledTimes(1));
  });

  it('does not re-hydrate once loaded, and exposes setLocale', () => {
    const { result } = renderHook(() => useTranslation());
    expect(hydrate).not.toHaveBeenCalled();
    expect(typeof result.current.setLocale).toBe('function');
    expect(result.current.isRtl).toBe(false);
  });

  it("applies the signed-in ACCOUNT's language once `me` resolves", async () => {
    // `me` lands after the first render, so a hydrate-once guard would never
    // apply the saved language — the choice would not follow the user to a new
    // device even though the switcher wrote it server-side.
    useMeStore.setState({ data: { me: { locale: 'hi-IN' } } } as never);
    renderHook(() => useTranslation());
    await waitFor(() => expect(hydrate).toHaveBeenCalledWith('hi-IN'));
  });

  it('applies each account language exactly once, however many components ask', async () => {
    useMeStore.setState({ data: { me: { locale: 'hi-IN' } } } as never);
    // Simulates hydrate having already run for this account.
    useLocaleStore.setState({ appliedUserLocale: 'hi-IN' });

    renderHook(() => useTranslation());
    renderHook(() => useTranslation());
    renderHook(() => useTranslation());

    // The marker lives in the store, not per hook, so three mounts are silent.
    expect(hydrate).not.toHaveBeenCalled();
  });
});
