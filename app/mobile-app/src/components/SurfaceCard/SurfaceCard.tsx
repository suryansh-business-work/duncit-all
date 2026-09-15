import { YStack, type YStackProps } from 'tamagui';

/**
 * The calm design's card: an opaque `$surface` block with 24px corners,
 * borderless on the light ground and a hairline in dark (`$cardBorder`).
 * Every prop is forwarded, so padding/gap/press styles are the caller's.
 * mWeb twin: `SURFACE_SX` in src/theme.ts.
 *
 * A pressable card passes `role="button"`, one `aria-label` naming what the
 * whole card opens, and `tabIndex={0}` — the prop that makes Tamagui mark the
 * card `accessible` on native, so VoiceOver reads it as ONE control instead of
 * a stop per line. Only when the card holds no other control: an `accessible`
 * view hides a Follow or Add button nested inside it from VoiceOver.
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
