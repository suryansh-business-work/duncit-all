import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { YStack } from 'tamagui';
import { logs } from '@duncit/logs';
import { imageSourceUrl, videoSourceUrl } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';

/** The widest a backdrop image draws, device pixels included — mWeb asks for the same. */
const BACKDROP_IMAGE_WIDTH = 1080;
/** The dark ground under everything: the same near-black mWeb paints (rule 27). */
const GROUND = '#09090f';
/** Heavier at the foot, where the button and the closing line sit, lighter in
 * the middle so the admin's frame still reads. White copy stays at 4.5:1. */
const SCRIM_COLORS = ['rgba(9,9,15,0.55)', 'rgba(9,9,15,0.38)', 'rgba(9,9,15,0.9)'] as const;
const SCRIM_STOPS = [0, 0.4, 1] as const;

/** The admin's clip, muted and looping; a clip the player cannot open reports back so the image stays. */
function BackdropVideo({
  url,
  testID,
  onFailed,
}: Readonly<{ url: string; testID: string; onFailed: () => void }>) {
  // Through `videoSourceUrl` for the reason every other player is: ImageKit's
  // metered re-encode answers 403 once spent, and a 403 is a black frame.
  const player = useVideoPlayer(videoSourceUrl(url), (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  // The setup-time play() can be swallowed before the remote source finishes
  // loading, so re-assert it once the player reports ready (as BrandBackdrop does).
  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') player.play();
      if (status === 'error') onFailed();
    });
    return () => sub.remove();
  }, [player, onFailed]);
  return (
    <VideoView
      testID={testID}
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

/** Whether the device asked for less motion — read once, then followed while the screen is open. */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduce(enabled);
      })
      .catch((error: unknown) =>
        logs.mobileApp.error('LaunchBackdrop', 'isReduceMotionEnabled', { error }),
      );
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

interface Props {
  videoUrl: string;
  imageUrl: string;
  testID: string;
}

/**
 * What a section plays behind its copy: the admin's video, muted and
 * looping, over its backup image. The image is always underneath, so a video
 * that is still loading, cannot be opened or 404s at request time leaves the
 * picture rather than a black frame — and a device set to Reduce Motion gets
 * the picture alone (WCAG 2.3.3). mWeb twin: components/city-launch/LaunchBackdrop.
 */
export function LaunchBackdrop({ videoUrl, imageUrl, testID }: Readonly<Props>) {
  const reduceMotion = useReduceMotion();
  const [videoFailed, setVideoFailed] = useState(false);
  const onFailed = useCallback(() => setVideoFailed(true), []);
  const showVideo = Boolean(videoUrl) && !reduceMotion && !videoFailed;

  return (
    <YStack
      testID={testID}
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      overflow="hidden"
      backgroundColor={GROUND}
      pointerEvents="none"
      aria-hidden
    >
      {imageUrl ? (
        <AppImage
          testID={`${testID}-image`}
          source={{ uri: imageSourceUrl(imageUrl, BACKDROP_IMAGE_WIDTH) }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}
      {showVideo ? (
        <BackdropVideo url={videoUrl} testID={`${testID}-video`} onFailed={onFailed} />
      ) : null}
      <LinearGradient
        colors={SCRIM_COLORS}
        locations={SCRIM_STOPS}
        style={StyleSheet.absoluteFill}
      />
    </YStack>
  );
}
