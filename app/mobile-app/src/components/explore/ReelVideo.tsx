import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { VideoView } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { YStack } from 'tamagui';

import { useInlineVideo } from '@/hooks/useInlineVideo';

/** Full-card reel playback — looping, and muted unless the caller (Explore's
 * sound toggle) says otherwise. Plays only while its card is the active
 * (visible) reel and pauses otherwise. `useInlineVideo` releases the player on
 * unmount (the reels FlatList keeps only the current card ±2 alive). */
export function ReelVideo({
  url,
  isActive,
  muted = true,
  testID,
}: Readonly<{ url: string; isActive: boolean; muted?: boolean; testID: string }>) {
  const player = useInlineVideo(url, isActive);
  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);
  return (
    <VideoView
      testID={testID}
      player={player}
      style={{ ...StyleSheet.absoluteFill, width: '100%', height: '100%' }}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

interface BackdropProps {
  pod: { pod_id: string; reel_url?: string | null };
  isActive: boolean;
  muted: boolean;
  width: number;
  height: number;
}

/** The media area behind a reel's overlay: the pod's reel video, or — purely
 * defensively — a dark backdrop when a reel-less pod slips past the feed filter. */
export function ReelBackdrop({ pod, isActive, muted, width, height }: Readonly<BackdropProps>) {
  return (
    <YStack
      width={width}
      height={height}
      alignItems="center"
      justifyContent="center"
      backgroundColor="#15131c"
    >
      {pod.reel_url ? (
        <ReelVideo
          url={pod.reel_url}
          isActive={isActive}
          muted={muted}
          testID={`reel-video-${pod.pod_id}`}
        />
      ) : (
        <MaterialIcons name="videocam-off" size={80} color="#4b4658" />
      )}
    </YStack>
  );
}
