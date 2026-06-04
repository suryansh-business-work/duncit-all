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

  if (isLoading && !branding) {
    return (
      <YStack alignItems="center" justifyContent="center" height={size} testID="auth-logo-loading">
        <Spinner color="$primary" />
      </YStack>
    );
  }

  if (isRasterUrl(branding?.logo_url)) {
    return (
      <Image
        testID="auth-logo-image"
        source={{ uri: branding.logo_url }}
        resizeMode="contain"
        role="img"
        aria-label={name}
        style={{ height: size, width: size * 3 }}
      />
    );
  }

  return <DuncitLogo size={size} />;
}
