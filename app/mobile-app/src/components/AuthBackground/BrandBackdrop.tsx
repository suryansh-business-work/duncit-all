import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { YStack } from 'tamagui';

/** Dark scrim so the auth card stays readable over any frame an admin picked. */
const SCRIM = 'rgba(0,0,0,0.45)';

/** Muted looping background video (admin-managed Branding URL). */
function BackdropVideo({ url }: Readonly<{ url: string }>) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  // The setup-time play() can be swallowed before the remote source finishes
  // loading, so re-assert it once the player reports ready — the same thing
  // SidebarVenuesCard has to do for the same reason.
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
 * The admin-configured backdrop behind the auth screens, plus its scrim.
 *
 * Video wins over image — the same precedence the server documents and mWeb
 * applies, decided by the caller passing an empty string for the one that lost.
 * Rendering nothing at all is the caller's job: with both switches off the
 * gradient underneath is the design, not a fallback.
 */
export function BrandBackdrop({
  videoUrl,
  imageUrl,
}: Readonly<{ videoUrl: string; imageUrl: string }>) {
  return (
    <YStack position="absolute" top={0} left={0} right={0} bottom={0} pointerEvents="none">
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
      <YStack position="absolute" top={0} left={0} right={0} bottom={0} backgroundColor={SCRIM} />
    </YStack>
  );
}
