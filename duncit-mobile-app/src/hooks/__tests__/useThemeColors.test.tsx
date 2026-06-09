import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { TamaguiProvider } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

import config from '../../../tamagui.config';

/** Wraps the hook in a Tamagui provider pinned to the light brand theme. */
function LightWrapper({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <TamaguiProvider config={config} defaultTheme="light">
      {children}
    </TamaguiProvider>
  );
}

/** Wraps the hook in a Tamagui provider pinned to the dark brand theme. */
function DarkWrapper({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <TamaguiProvider config={config} defaultTheme="dark">
      {children}
    </TamaguiProvider>
  );
}

const TOKENS = [
  'background',
  'surface',
  'color',
  'muted',
  'primary',
  'danger',
  'onPrimary',
  'borderColor',
] as const;

describe('useThemeColors', () => {
  it('resolves every brand token to a raw colour string', () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper: LightWrapper });

    for (const token of TOKENS) {
      expect(typeof result.current[token]).toBe('string');
      expect(result.current[token]).not.toBe('');
    }
  });

  it('tracks the active theme rather than hardcoding colours', () => {
    const lightHook = renderHook(() => useThemeColors(), { wrapper: LightWrapper });
    const darkHook = renderHook(() => useThemeColors(), { wrapper: DarkWrapper });

    expect(lightHook.result.current.background).not.toBe(darkHook.result.current.background);
  });
});
