import { renderHook } from '@testing-library/react-native';
import { dark, light } from '@duncit/auth-tokens';

import { useOccasionAppearance } from '@/hooks/useOccasionAppearance';
import { useOccasionLook, type OccasionLook } from '@/hooks/useOccasionLook';

jest.mock('@/hooks/useOccasionLook', () => ({ useOccasionLook: jest.fn() }));

const mockedLook = jest.mocked(useOccasionLook);
const base = { light, dark };

const halloween: OccasionLook = {
  key: 'halloween',
  color_mode: 'DARK',
  greeting: 'Happy Halloween!',
  palette_light: {},
  palette_dark: { primary: '#FF7A1A', bg: '#120A1F', ink: '' },
  particles: [],
  flyers: [],
  fireworks: { enabled: false, colors: [], bursts_per_minute: 0, sparks: 0, radius: 0 },
  overlays: [],
  garland: { style: 'SPIDER_WEB', colors: [] },
};

beforeEach(() => {
  mockedLook.mockReset();
});

describe('useOccasionAppearance', () => {
  it('leaves the house look untouched, down to the same palettes object', () => {
    mockedLook.mockReturnValue(null);
    const { result } = renderHook(() => useOccasionAppearance(base, 'light'));
    expect(result.current.look).toBeNull();
    expect(result.current.palettes).toBe(base);
    expect(result.current.mode).toBe('light');
    expect(result.current.navTheme.colors.background).toBe(light.bg);
  });

  it('follows the viewer into dark mode when no look pins one', () => {
    mockedLook.mockReturnValue({ ...halloween, color_mode: 'AUTO' });
    const { result } = renderHook(() => useOccasionAppearance(base, 'dark'));
    expect(result.current.mode).toBe('dark');
  });

  it("paints the look's colours in the mode it pins, ground and navigator included", () => {
    mockedLook.mockReturnValue(halloween);
    const { result } = renderHook(() => useOccasionAppearance(base, 'light'));
    expect(result.current.look).toBe(halloween);
    expect(result.current.mode).toBe('dark');
    expect(result.current.palettes.dark).toMatchObject({
      primary: '#FF7A1A',
      bg: '#120A1F',
      ink: dark.ink,
    });
    expect(result.current.palettes.light).toEqual(light);
    expect(result.current.navTheme.colors.background).toBe('#120A1F');
  });

  it('keeps the same palettes object across renders while the look holds', () => {
    mockedLook.mockReturnValue(halloween);
    const { result, rerender } = renderHook(() => useOccasionAppearance(base, 'light'));
    const first = result.current;
    rerender({});
    expect(result.current.palettes).toBe(first.palettes);
    expect(result.current.navTheme).toBe(first.navTheme);
  });
});
