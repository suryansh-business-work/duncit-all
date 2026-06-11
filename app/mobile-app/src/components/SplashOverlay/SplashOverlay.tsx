import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

import { AuthLogo } from '@/components/AuthLogo';
import { useBranding } from '@/hooks/useBranding';

const SPLASH_MS = 1600;
const VIDEO_SPLASH_MS = 4000;
const FADE_MS = 350;

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
 * Branded boot splash shown for a beat on every cold start then faded out
 * (mWeb-parity; the native expo-splash-screen only covers the binary launch,
 * not the JS boot). The media is admin-managed: a full-bleed splash image or
 * video when configured, otherwise the brand logo from the same setting.
 */
export function SplashOverlay({ onDone }: Readonly<{ onDone?: () => void }>) {
  const [visible, setVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const { data } = useBranding();
  const branding = data?.branding;
  const splashUrl = branding?.mobile_splash_url ?? '';
  const isVideo = splashUrl !== '' && (branding?.mobile_splash_type ?? 'IMAGE') === 'VIDEO';
  const displayMs = isVideo ? VIDEO_SPLASH_MS : SPLASH_MS;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(
        () => {
          setVisible(false);
          onDone?.();
        },
      );
    }, displayMs);
    return () => clearTimeout(timer);
  }, [opacity, onDone, displayMs]);

  if (!visible) return null;

  return (
    <Animated.View testID="splash-overlay" style={[styles.fill, { opacity }]} pointerEvents="none">
      {isVideo ? <SplashVideo url={splashUrl} /> : null}
      {!isVideo && splashUrl ? (
        <Image
          testID="splash-image"
          source={{ uri: splashUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}
      {!splashUrl ? <AuthLogo size={96} /> : null}
    </Animated.View>
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
