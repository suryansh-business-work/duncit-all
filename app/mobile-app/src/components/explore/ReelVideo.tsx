import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { YStack } from 'tamagui';

/** Full-card reel playback — muted + looping. Plays only while its card is the
 * active (visible) reel and pauses otherwise. `useVideoPlayer` releases the
 * player on unmount (the reels FlatList keeps only the current card ±2 alive). */
export function ReelVideo({
  url,
  isActive,
  testID,
}: Readonly<{ url: string; isActive: boolean; testID: string }>) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
  });
  useEffect(() => {
    if (!isActive) {
      player.pause();
      return undefined;
    }
    // The remote source may still be loading when the card becomes active —
    // start now and re-assert once it reports ready (same as SidebarVenuesCard).
    player.play();
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') player.play();
    });
    return () => sub.remove();
  }, [player, isActive]);
  return (
    <VideoView
      testID={testID}
      player={player}
      style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

interface BackdropProps {
  pod: { pod_id: string; reel_url?: string | null };
  isActive: boolean;
  width: number;
  height: number;
}

/** The media area behind a reel's overlay: the pod's reel video, or — purely
 * defensively — a dark backdrop when a reel-less pod slips past the feed filter. */
export function ReelBackdrop({ pod, isActive, width, height }: Readonly<BackdropProps>) {
  return (
    <YStack
      width={width}
      height={height}
      alignItems="center"
      justifyContent="center"
      backgroundColor="#15131c"
    >
      {pod.reel_url ? (
        <ReelVideo url={pod.reel_url} isActive={isActive} testID={`reel-video-${pod.pod_id}`} />
      ) : (
        <MaterialIcons name="videocam-off" size={80} color="#4b4658" />
      )}
    </YStack>
  );
}
