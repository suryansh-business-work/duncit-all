import { semantic } from '@duncit/auth-tokens';
import type { ClubAdminTrendPalette, StatusTone } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';

/**
 * The theme colour behind each shared status tone — the native side of the
 * MUI chip palette the portals and mWeb map the same tones onto (rule 27).
 * Which tone a status or an audit action takes is decided in @duncit/utils;
 * only the paint lives here.
 */
export function useToneColors(): Record<StatusTone, string> {
  const { muted, success, warning, danger } = useThemeColors();
  return { default: muted, info: semantic.info, success, warning, error: danger };
}

/** The line colour of each trend series, by the palette name the shared
 * series list carries. */
export function useTrendPalette(): Record<ClubAdminTrendPalette, string> {
  const { primary, success, warning } = useThemeColors();
  return { primary, success, info: semantic.info, warning };
}
