import { Image, type ImageProps } from 'expo-image';

type ResizeMode = 'cover' | 'contain';

export interface AppImageProps {
  source: ImageProps['source'];
  style?: ImageProps['style'];
  /** RN-style fit, mapped to expo-image's `contentFit`. */
  resizeMode?: ResizeMode;
  /** Stable key for list recycling — clears the previous image on view reuse
   * so a recycled row never flashes the outgoing image. */
  recyclingKey?: string;
  testID?: string;
  accessibilityLabel?: string;
  /** The remote image could not be loaded — how a caller switches to its
   * bundled fallback icon (rule 39). A URL that 404s never arrives empty, so
   * this is the only signal that distinguishes broken from blank. */
  onError?: () => void;
  /** The decoded image's intrinsic pixel size, once known — for callers that
   * size a box from the art's own aspect ratio. */
  onLoad?: (size: { width: number; height: number }) => void;
}

const CACHE_POLICY = 'memory-disk';
const TRANSITION_MS = 150;

/**
 * App-wide image built on expo-image with a memory+disk cache, so a remote URL
 * is decoded once and reused everywhere (avatars, covers, reels) instead of
 * react-native's core Image, which re-decodes a full-resolution bitmap on every
 * mount → memory pressure and GC-driven frame drops. Drop-in replacement for
 * react-native's Image for the props this app actually uses.
 */
export function AppImage({
  source,
  style,
  resizeMode = 'cover',
  recyclingKey,
  testID,
  accessibilityLabel,
  onError,
  onLoad,
}: Readonly<AppImageProps>) {
  return (
    <Image
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      source={source}
      style={style}
      contentFit={resizeMode}
      recyclingKey={recyclingKey}
      cachePolicy={CACHE_POLICY}
      transition={TRANSITION_MS}
      onError={onError ? () => onError() : undefined}
      onLoad={
        onLoad ? (e) => onLoad({ width: e.source.width, height: e.source.height }) : undefined
      }
    />
  );
}
