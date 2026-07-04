import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { VideoView, useVideoPlayer } from 'expo-video';

import { AuthLogo } from '@/components/AuthLogo';
import { useBranding } from '@/hooks/useBranding';

const SPLASH_MS = 1600;
const VIDEO_SPLASH_MS = 4000;
// Logo is a share of the shorter screen edge (so it stays centred and
// proportional on any device), capped so it never dominates a tablet.
const LOGO_RATIO = 0.4;
const LOGO_MAX = 180;

/** Full-bleed muted looping splash video (Branding → 1B Mobile App). */
function SplashVideo({ url }: Readonly<{ url: string }>) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      testID="splash-video"
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

/**
 * Branded boot splash shown for a beat on every cold start then removed
 * (mWeb-parity; the native expo-splash-screen only covers the binary launch,
 * not the JS boot). The media is admin-managed: a full-bleed splash image or
 * video when configured, otherwise the brand logo — always centred and sized
 * responsively to the viewport.
 */
export function SplashOverlay({ onDone }: Readonly<{ onDone?: () => void }>) {
  const [visible, setVisible] = useState(true);
  const { width, height } = useWindowDimensions();
  const { data } = useBranding();
  const branding = data?.branding;
  const splashUrl = branding?.mobile_splash_url ?? '';
  const isVideo = splashUrl !== '' && (branding?.mobile_splash_type ?? 'IMAGE') === 'VIDEO';
  const displayMs = isVideo ? VIDEO_SPLASH_MS : SPLASH_MS;
  const logoSize = Math.min(Math.round(Math.min(width, height) * LOGO_RATIO), LOGO_MAX);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, displayMs);
    return () => clearTimeout(timer);
  }, [onDone, displayMs]);

  if (!visible) return null;

  return (
    <View testID="splash-overlay" style={styles.fill} pointerEvents="none">
      {isVideo ? <SplashVideo url={splashUrl} /> : null}
      {!isVideo && splashUrl ? (
        <AppImage
          testID="splash-image"
          source={{ uri: splashUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}
      {!splashUrl ? <AuthLogo size={logoSize} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F82C2E',
  },
});
