import Svg, { Path, Rect } from 'react-native-svg';

/**
 * The Duncit brand mark, a faithful React Native port of the shared web asset
 * `mweb-app/public/duncit-logo.svg` (same viewBox, colors and paths) so the
 * logo is visually identical on web and native. Used as the auth-screen logo
 * whenever the dynamic branding logo isn't a renderable raster.
 */
export function DuncitLogo({ size = 56 }: Readonly<{ size?: number }>) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Duncit"
      testID="auth-logo-mark"
    >
      <Rect width={64} height={64} rx={15} fill="#FF5A5A" />
      <Path
        d="M19 16h7a16 16 0 0 1 0 32h-7z"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M31 16h7a16 16 0 0 1 0 32h-7"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
