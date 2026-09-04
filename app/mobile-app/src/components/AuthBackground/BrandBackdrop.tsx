import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { YStack } from 'tamagui';
import { auth } from '@duncit/auth-tokens';

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
  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') player.play();
    });
    return () => sub.remove();
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

/**
 * The admin-configured backdrop behind the auth screens, plus its fog.
 *
 * The fog FOLLOWS THE THEME, and that is the whole point of it: the old scrim
 * was always dark, so in light mode the screen darkened a photo and then drew
 * near-black heading text on top of it — the copy was unreadable over anything
 * an admin actually picked. Light mode now hazes the frame white and dark mode
 * hazes it near-black, so the text keeps the contrast its own theme gives it.
 *
 * Three layers, all read from `auth.fog` so mWeb draws the same picture from
 * the same numbers (rule 27): the media dimmed to `mediaOpacity`, a flat
 * `veil` over the whole frame, and an `edge` gradient that thickens toward the
 * top and bottom where the logo, the legal line and the version sit.
 *
 * Video wins over image — the same precedence the server documents and mWeb
 * applies, decided by the caller passing an empty string for the one that lost.
 * Rendering nothing at all is the caller's job: with both switches off the
 * gradient underneath is the design, not a fallback.
 */
export function BrandBackdrop({
  videoUrl,
  imageUrl,
  isDark,
}: Readonly<{ videoUrl: string; imageUrl: string; isDark: boolean }>) {
  const fog = isDark ? auth.fog.dark : auth.fog.light;
  const fogColors = [fog.edge, fog.clear, fog.clear, fog.edge] as const;
  const fogStops = [0, auth.fog.edgeStop, 1 - auth.fog.edgeStop, 1] as const;

  return (
    <YStack position="absolute" top={0} left={0} right={0} bottom={0} pointerEvents="none">
      <YStack
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        opacity={auth.fog.mediaOpacity}
      >
        {videoUrl ? (
          <BackdropVideo url={videoUrl} />
        ) : (
          <Image
            testID="auth-backdrop-image"
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}
      </YStack>
      <YStack
        testID="auth-backdrop-veil"
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        backgroundColor={fog.veil}
      />
      <LinearGradient
        testID="auth-backdrop-fog"
        colors={fogColors}
        locations={fogStops}
        style={StyleSheet.absoluteFill}
      />
    </YStack>
  );
}
