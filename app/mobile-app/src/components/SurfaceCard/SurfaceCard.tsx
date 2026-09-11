import { YStack, type YStackProps } from 'tamagui';

/**
 * The calm design's card: an opaque `$surface` block with 24px corners,
 * borderless on the light ground and a hairline in dark (`$cardBorder`).
 * Every prop is forwarded, so padding/gap/press styles are the caller's.
 * mWeb twin: `SURFACE_SX` in src/theme.ts.
 */
export function SurfaceCard(props: Readonly<YStackProps>) {
  return (
    <YStack
      backgroundColor="$surface"
      borderRadius={24}
      borderWidth={1}
      borderColor="$cardBorder"
      padding={16}
      {...props}
    />
  );
}
