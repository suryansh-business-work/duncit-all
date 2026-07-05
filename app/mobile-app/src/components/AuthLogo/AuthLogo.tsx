import { useState } from 'react';
import { Image, useWindowDimensions } from 'react-native';
import { Spinner, Text, YStack } from 'tamagui';

import { useBranding } from '@/hooks/useBranding';

/** A remote raster (PNG/JPG) logo renders as an image; everything else (SVG,
 * relative path, empty) falls back to the app-name monogram. */
function isRasterUrl(url?: string | null): url is string {
  return !!url && /^https?:\/\//.test(url) && !/\.svg(\?|#|$)/i.test(url);
}

/**
 * Brand logo for the auth screens, fully admin-managed (Branding → 1B Mobile
 * App): the mobile logo wins, then the global logo. When neither is a
 * renderable raster, the app-name monogram renders — no bundled logo files.
 */
export function AuthLogo({ size = 58 }: Readonly<{ size?: number }>) {
  const { data, isLoading } = useBranding();
  const { width: windowWidth } = useWindowDimensions();
  const branding = data?.branding;
  const name = branding?.app_name ?? 'Duncit';
  const logoUrl = branding?.mobile_logo_url || branding?.logo_url;
  // Track the logo's intrinsic aspect ratio so the image width follows the art
  // (mWeb uses width:auto) instead of a fixed box that leaves a gap. Defaults to
  // square so there's no gap before the remote size is known.
  const [aspect, setAspect] = useState(1);

  if (isLoading && !branding) {
    return (
      <YStack alignItems="center" justifyContent="center" height={size} testID="auth-logo-loading">
        <Spinner color="$primary" />
      </YStack>
    );
  }

  if (isRasterUrl(logoUrl)) {
    // Cap width at 4× height (matches mWeb's maxWidth clamp) for very wide marks,
    // and never wider than the viewport (minus padding) so a very wide wordmark
    // can't overflow and clip on a narrow phone.
    const width = Math.min(size * aspect, size * 4, windowWidth - 48);
    return (
      <Image
        testID="auth-logo-image"
        source={{ uri: logoUrl }}
        resizeMode="contain"
        role="img"
        aria-label={name}
        onLoad={(e) => {
          const src = e.nativeEvent.source;
          if (src?.width && src?.height) setAspect(src.width / src.height);
        }}
        style={{ height: size, width }}
      />
    );
  }

  return (
    <YStack
      testID="auth-logo-mark"
      width={size}
      height={size}
      borderRadius={size * 0.23}
      backgroundColor="#F82C2E"
      alignItems="center"
      justifyContent="center"
      role="img"
      aria-label={name}
    >
      <Text fontSize={size * 0.5} fontWeight="900" color="#ffffff">
        {(name[0] ?? 'D').toUpperCase()}
      </Text>
    </YStack>
  );
}
