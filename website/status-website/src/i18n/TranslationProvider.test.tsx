/**
 * Localization on a page whose whole job is to still be readable when things
 * are broken.
 *
 * It carries no Apollo client and no session, so it cannot use the portals'
 * LocaleProvider — but it uses the same runtime and the same admin data (rule
 * 38). Both fetches are best-effort on purpose: the bundled fallback is what
 * renders when either is missing, and a status page that went blank because a
 * localization query failed would be reporting on its own outage.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchLocales = vi.fn();
const fetchTranslations = vi.fn();

vi.mock('../api', () => ({
  fetchLocales: (...args: unknown[]) => fetchLocales(...args),
  fetchTranslations: (...args: unknown[]) => fetchTranslations(...args),
}));

const { TranslationProvider, useTranslation } = await import('./TranslationProvider');

const HINDI = { code: 'hi-IN', label: 'हिंदी', english_label: 'Hindi', is_rtl: false, is_default: false, sort_order: 1 };
const URDU = { code: 'ur-PK', label: 'اردو', english_label: 'Urdu', is_rtl: true, is_default: false, sort_order: 2 };

function Probe() {
  const { t, locale, isRtl } = useTranslation();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="rtl">{String(isRtl)}</span>
      <span data-testid="heading">{t('status.report.heading')}</span>
    </div>
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

beforeEach(() => {
  fetchLocales.mockReset();
  fetchTranslations.mockReset();
  vi.stubGlobal('navigator', { ...globalThis.navigator, language: 'hi-IN' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useTranslation outside a provider', () => {
  it('still translates, from the bundle the site ships', () => {
    render(<Probe />);

    expect(text('locale')).toBe('en-IN');
    expect(text('rtl')).toBe('false');
    // Real copy, not the key — the fallback is the point of shipping one.
    expect(text('heading')).not.toBe('status.report.heading');
  });
});

describe('TranslationProvider', () => {
  it('adopts the reader’s language and layers the server catalogue over the bundle', async () => {
    fetchLocales.mockResolvedValue([HINDI]);
    fetchTranslations.mockResolvedValue({ 'status.report.heading': 'समस्या बताएं' });

    render(
      <TranslationProvider>
        <Probe />
      </TranslationProvider>,
    );

    await waitFor(() => expect(text('locale')).toBe('hi-IN'));
    await waitFor(() => expect(text('heading')).toBe('समस्या बताएं'));
    expect(fetchTranslations).toHaveBeenCalledWith('hi-IN', expect.anything());
  });

  it('marks a right-to-left locale as one', async () => {
    vi.stubGlobal('navigator', { ...globalThis.navigator, language: 'ur-PK' });
    fetchLocales.mockResolvedValue([URDU]);
    fetchTranslations.mockResolvedValue({});

    render(
      <TranslationProvider>
        <Probe />
      </TranslationProvider>,
    );

    await waitFor(() => expect(text('rtl')).toBe('true'));
  });

  it('stays on the bundled copy when the platform offers no matching locale', async () => {
    fetchLocales.mockResolvedValue([]);

    render(
      <TranslationProvider>
        <Probe />
      </TranslationProvider>,
    );

    await waitFor(() => expect(fetchLocales).toHaveBeenCalled());
    expect(text('locale')).toBe('en-IN');
    // No locale resolved means there is nothing to ask a catalogue for.
    expect(fetchTranslations).not.toHaveBeenCalled();
  });

  it('renders anyway when the localization queries themselves fail', async () => {
    fetchLocales.mockRejectedValue(new Error('offline'));

    render(
      <TranslationProvider>
        <Probe />
      </TranslationProvider>,
    );

    await waitFor(() => expect(fetchLocales).toHaveBeenCalled());
    expect(text('heading')).not.toBe('');
    expect(text('locale')).toBe('en-IN');
  });

  it('abandons the load when the page goes away mid-fetch', async () => {
    fetchLocales.mockResolvedValue([HINDI]);
    fetchTranslations.mockResolvedValue({});

    const { unmount } = render(
      <TranslationProvider>
        <Probe />
      </TranslationProvider>,
    );
    await waitFor(() => expect(fetchLocales).toHaveBeenCalled());
    const signal = fetchLocales.mock.calls[0]?.[0] as AbortSignal;
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });
});
