import { useEffect } from 'react';
import { AccessibilityInfo, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { YStack } from 'tamagui';
import { auth } from '@duncit/auth-tokens';
import { logs } from '@duncit/logs';

/** Muted looping background video (admin-managed Branding URL). */
function BackdropVideo({ url }: Readonly<{ url: string }>) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  // The setup-time play() can be swallowed before the remote source finishes
  // loading, so re-assert it once the player reports ready — the same thing
  // every other remote-video surface in the app has to do for the same reason.
  //
  // An endless background loop is motion nobody can pause (WCAG 2.2.2), so a
  // device set to Reduce Motion holds it still on its frame instead — and
  // follows the setting if it is switched while the screen is open.
  useEffect(() => {
    let mounted = true;
    let reduceMotion = false;
    const applyMotion = (enabled: boolean) => {
      if (!mounted) return;
      reduceMotion = enabled;
      if (enabled) player.pause();
      else player.play();
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .then(applyMotion)
      .catch((error: unknown) =>
        logs.mobileApp.error('BrandBackdrop', 'isReduceMotionEnabled', { error }),
      );
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', applyMotion);
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay' && !reduceMotion) player.play();
    });
    return () => {
      mounted = false;
      motion.remove();
      sub.remove();
    };
  }, [player]);
  return (
    <VideoView
      testID="auth-backdrop-video"
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

/** The hero's height on this window — the content below starts over its lower half. */
export function useAuthHeroHeight(): number {
  const { height } = useWindowDimensions();
  return Math.round(height * auth.hero.heightRatio);
}

/**
 * The admin-configured login image or video (Branding > Login background),
 * drawn as a hero across the top that fades into the screen's ground.
 *
 * It replaced a full-screen fogged backdrop that left the photo barely
 * visible. The fade FOLLOWS THE THEME — clear at the top, the ground colour at
 * the bottom — so the heading over its lower half keeps the contrast its own
 * theme gives it. Read from `auth.hero`, so mWeb draws the same picture from
 * the same numbers (rule 27).
 *
 * Video wins over image — the same precedence the server documents and mWeb
 * applies, decided by the caller passing an empty string for the one that lost.
 * Rendering nothing at all is the caller's job: with both switches off the
 * flat ground underneath is the design, not a fallback.
 */
export function BrandBackdrop({
  videoUrl,
  imageUrl,
  isDark,
}: Readonly<{ videoUrl: string; imageUrl: string; isDark: boolean }>) {
  const heroHeight = useAuthHeroHeight();
  const fade = isDark ? auth.hero.dark : auth.hero.light;
  const fadeColors = [fade.clear, fade.clear, fade.ground] as const;
  const fadeStops = [0, auth.hero.fadeStart, 1] as const;

  return (
    <YStack
      testID="auth-hero"
      position="absolute"
      top={0}
      left={0}
      right={0}
      height={heroHeight}
      overflow="hidden"
      pointerEvents="none"
    >
      {videoUrl ? (
        <BackdropVideo url={videoUrl} />
      ) : (
        <Image
          testID="auth-backdrop-image"
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      )}
      <LinearGradient
        testID="auth-hero-fade"
        colors={fadeColors}
        locations={fadeStops}
        style={StyleSheet.absoluteFill}
      />
    </YStack>
  );
}
