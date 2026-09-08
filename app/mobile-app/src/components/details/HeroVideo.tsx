import { VideoView } from 'expo-video';

import { useInlineVideo } from '@/hooks/useInlineVideo';

/**
 * A cover video inside the pod / club hero carousel — muted and looping, the
 * same shape mWeb's `VideoMedia` gives the twin surface (rule 27).
 */
export function HeroVideo({
  url,
  isActive,
  width,
  height,
  testID,
}: Readonly<{
  url: string;
  isActive: boolean;
  width: number;
  height: number;
  testID: string;
}>) {
  const player = useInlineVideo(url, isActive);
  return (
    <VideoView
      testID={testID}
      player={player}
      style={{ width, height }}
      contentFit="cover"
      nativeControls={false}
    />
  );
}
