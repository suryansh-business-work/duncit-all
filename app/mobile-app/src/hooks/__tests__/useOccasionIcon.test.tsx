import { renderHook } from '@testing-library/react-native';

import { FALLBACK_ICONS } from '@/assets/fallback-icons';
import { useOccasionIcon } from '@/hooks/useOccasionIcon';

const mockBranding = jest.fn();
jest.mock('@/hooks/useBranding', () => ({ useBranding: () => mockBranding() }));

let mockNowMs = new Date('2026-11-07T00:00:00.000Z').getTime();
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ clock: { nowMs: () => mockNowMs } }),
}));

const diwali = {
  slug: 'diwali',
  label: 'Diwali',
  starts_at: '2026-11-05T00:00:00.000Z',
  ends_at: '2026-11-12T00:00:00.000Z',
  icon_url: 'https://cdn/diwali.png',
  is_active: true,
  sort_order: 0,
};

const withOccasions = (occasional_icons: unknown[]) =>
  mockBranding.mockReturnValue({ data: { branding: { occasional_icons } } });

beforeEach(() => {
  mockBranding.mockReset();
  mockNowMs = new Date('2026-11-07T00:00:00.000Z').getTime();
});

describe('useOccasionIcon', () => {
  it('prefers the BUNDLED art for a slug the app ships', () => {
    withOccasions([diwali]);
    const { result } = renderHook(() => useOccasionIcon());
    expect(result.current?.slug).toBe('diwali');
    expect(result.current?.isBundled).toBe(true);
    // A bundled asset is a Metro module id, never a { uri } object.
    expect(result.current?.source).not.toEqual({ uri: 'https://cdn/diwali.png' });
  });

  it("falls back to the admin's icon_url when the app ships no art for the slug", () => {
    withOccasions([{ ...diwali, slug: 'not-bundled' }]);
    const { result } = renderHook(() => useOccasionIcon());
    expect(result.current).toEqual({
      slug: 'not-bundled',
      label: 'Diwali',
      source: { uri: 'https://cdn/diwali.png' },
      isBundled: false,
    });
  });

  it('returns null outside every window, and when nothing is configured', () => {
    withOccasions([diwali]);
    mockNowMs = new Date('2026-06-01T00:00:00.000Z').getTime();
    expect(renderHook(() => useOccasionIcon()).result.current).toBeNull();

    withOccasions([]);
    mockNowMs = new Date('2026-11-07T00:00:00.000Z').getTime();
    expect(renderHook(() => useOccasionIcon()).result.current).toBeNull();

    mockBranding.mockReturnValue({ data: null });
    expect(renderHook(() => useOccasionIcon()).result.current).toBeNull();
  });

  it('renders the BOUND fallback icon for an unbundled slug with no icon_url', () => {
    withOccasions([
      { ...diwali, slug: 'not-bundled', icon_url: '', fallback_icon: 'all-vibe' },
    ]);
    const active = renderHook(() => useOccasionIcon()).result.current;
    // An active occasion must never render nothing.
    expect(active?.source).toBe(FALLBACK_ICONS['all-vibe']);
    expect(active?.isBundled).toBe(true);
  });

  it('lands on the generic occasion art when the binding is unset or unknown', () => {
    withOccasions([{ ...diwali, slug: 'not-bundled', icon_url: '', fallback_icon: '' }]);
    expect(renderHook(() => useOccasionIcon()).result.current?.source).toBe(
      FALLBACK_ICONS.occasion,
    );

    // The DB does not own the name list, so a stale value resolves, not crashes.
    withOccasions([{ ...diwali, slug: 'not-bundled', icon_url: '', fallback_icon: 'retired' }]);
    expect(renderHook(() => useOccasionIcon()).result.current?.source).toBe(
      FALLBACK_ICONS.occasion,
    );
  });

  it('follows the CLOCK, so a custom admin time switches the icon', () => {
    withOccasions([
      diwali,
      {
        ...diwali,
        slug: 'holi',
        starts_at: '2027-03-01T00:00:00.000Z',
        ends_at: '2027-03-05T00:00:00.000Z',
      },
    ]);
    expect(renderHook(() => useOccasionIcon()).result.current?.slug).toBe('diwali');
    mockNowMs = new Date('2027-03-02T00:00:00.000Z').getTime();
    expect(renderHook(() => useOccasionIcon()).result.current?.slug).toBe('holi');
  });

  it('coalesces a missing label on both the bundled and hosted paths', () => {
    withOccasions([{ ...diwali, label: null }]);
    expect(renderHook(() => useOccasionIcon()).result.current?.label).toBe('');

    withOccasions([{ ...diwali, slug: 'not-bundled', label: null }]);
    const hosted = renderHook(() => useOccasionIcon()).result.current;
    expect(hosted?.label).toBe('');
    expect(hosted?.isBundled).toBe(false);
  });
});
