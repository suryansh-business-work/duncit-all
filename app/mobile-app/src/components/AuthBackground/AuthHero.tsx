import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Theme, YStack } from 'tamagui';
import { auth } from '@duncit/auth-tokens';
import { logs } from '@duncit/logs';

import { useAuthHeroMedia } from './useAuthHeroMedia';

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
        logs.mobileApp.error('AuthHero', 'isReduceMotionEnabled', { error }),
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

const { scrim } = auth.hero;
/** Clear photo at the top, the scrim where the heading begins. */
const SCRIM_FADE = [scrim.clear, scrim.ground] as const;

interface AuthHeroProps {
  /** The photo's clear height above the heading. */
  room: number;
  children: ReactNode;
}

/**
 * The admin-configured login image or video (Branding > Login background),
 * drawn as a hero across the top with the auth heading ON it.
 *
 * In flow, not pinned behind the screen: the hero is as tall as the photo room
 * plus whatever the heading needs, so the heading can never slide off the
 * darkened part — at any font scale or window height. The photo shows clear
 * across `room`, darkens to `auth.hero.scrim`, and the heading sits on that
 * scrim drawn in the DARK theme in both modes, which is what keeps
 * "Welcome back!" and its subtitle at AA over any photo (the scrim's numbers
 * are worked in the auth-tokens docs). mWeb twin: components/AuthHero.
 *
 * Video wins over image — the same precedence the server documents and mWeb
 * applies. With both switches off the heading renders on the flat ground in
 * the active theme, exactly as before.
 */
export function AuthHero({ room, children }: Readonly<AuthHeroProps>) {
  const { videoUrl, imageUrl, hasHero } = useAuthHeroMedia();
  if (!hasHero) return <>{children}</>;

  return (
    <YStack testID="auth-hero" overflow="hidden">
      <YStack position="absolute" top={0} left={0} right={0} bottom={0} pointerEvents="none">
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
      </YStack>
      <YStack height={room} pointerEvents="none">
        <LinearGradient
          testID="auth-hero-fade"
          colors={SCRIM_FADE}
          style={StyleSheet.absoluteFill}
        />
      </YStack>
      <Theme name="dark">
        <YStack backgroundColor={scrim.ground}>{children}</YStack>
      </Theme>
    </YStack>
  );
}
