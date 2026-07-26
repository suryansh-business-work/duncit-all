import { useState } from 'react';
import { Image, useWindowDimensions } from 'react-native';
import { Spinner, YStack } from 'tamagui';
import { resolveIconSource } from '@duncit/fallback-icons';

import { useBranding } from '@/hooks/useBranding';
import { FALLBACK_ICONS } from '@/assets/fallback-icons';

/** A remote raster (PNG/JPG) logo renders as an image; everything else (SVG,
 * relative path, empty) is not renderable here and takes the bundled copy. */
function isRasterUrl(url?: string | null): url is string {
  return !!url && /^https?:\/\//.test(url) && !/\.svg(\?|#|$)/i.test(url);
}

/**
 * Brand logo for the auth screens, fully admin-managed (Branding → 1B Mobile
 * App): the mobile logo wins, then the global logo. When neither is a
 * renderable raster — or the remote image fails to load — the BUNDLED logo
 * renders from assets/fallback-icons (rule 39), matching mWeb exactly.
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
  const [failed, setFailed] = useState(false);

  const { source, isFallback } = resolveIconSource(
    isRasterUrl(logoUrl) ? logoUrl : null,
    FALLBACK_ICONS.logo,
    failed,
  );

  if (isLoading && !branding) {
    return (
      <YStack alignItems="center" justifyContent="center" height={size} testID="auth-logo-loading">
        <Spinner color="$primary" />
      </YStack>
    );
  }

  // Cap width at 4× height (matches mWeb's maxWidth clamp) for very wide marks,
  // and never wider than the viewport (minus padding) so a very wide wordmark
  // can't overflow and clip on a narrow phone.
  const width = Math.min(size * aspect, size * 4, windowWidth - 48);
  return (
    <Image
      testID={isFallback ? 'auth-logo-fallback' : 'auth-logo-image'}
      source={isFallback ? FALLBACK_ICONS.logo : { uri: source as string }}
      resizeMode="contain"
      role="img"
      aria-label={name}
      onError={() => setFailed(true)}
      onLoad={(e) => {
        const src = e.nativeEvent.source;
        if (src?.width && src?.height) setAspect(src.width / src.height);
      }}
      style={{ height: size, width }}
    />
  );
}
