import { useState } from 'react';
import { Image } from 'react-native';
import { Spinner, YStack } from 'tamagui';

import { DuncitLogo } from '@/components/DuncitLogo';
import { useBranding } from '@/hooks/useBranding';

/** A remote raster (PNG/JPG) logo renders as an image; everything else (SVG,
 * relative path, empty) falls back to the bundled Duncit mark. */
function isRasterUrl(url?: string | null): url is string {
  return !!url && /^https?:\/\//.test(url) && !/\.svg(\?|#|$)/i.test(url);
}

/**
 * Brand logo for the auth screens. Mirrors mWeb's <AuthLogo/> logic: a custom
 * raster `logo_url` from the shared server `branding` setting wins; otherwise the
 * bundled Duncit mark renders, so the logo is identical across web and native.
 */
export function AuthLogo({ size = 58 }: { size?: number }) {
  const { data, isLoading } = useBranding();
  const branding = data?.branding;
  const name = branding?.app_name ?? 'Duncit';
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

  if (isRasterUrl(branding?.logo_url)) {
    // Cap width at 4× height (matches mWeb's maxWidth clamp) for very wide marks.
    const width = Math.min(size * aspect, size * 4);
    return (
      <Image
        testID="auth-logo-image"
        source={{ uri: branding.logo_url }}
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

  return <DuncitLogo size={size} />;
}
