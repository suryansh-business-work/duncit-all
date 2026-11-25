import { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useVideoPlayer, VideoView } from 'expo-video';
import { fireAndForget, logs } from '@duncit/logs';

const SPLASH_VIDEO = require('../../../assets/duncit-crm-splash-screen.mp4');
const SCOPE = 'crm-app/LaunchSplash';

/** The video is three seconds; whatever happens to it, the app is never held back longer than this. */
export const SPLASH_MAX_MS = 4500;
const FADE_MS = 250;

/** Put the native (still) splash away; safe to call more than once. */
export const hideNativeSplash = () =>
  fireAndForget(SplashScreen.hideAsync(), logs.mobileApp, SCOPE, 'hide');

/**
 * The Duncit CRM launch video, played once on a cold start over the app,
 * which loads underneath it meanwhile. The native splash (the same red, with
 * the CRM mark) stays up until the video's first frame is drawn, so the hand-
 * over is seamless; the video then fades into the app. It is skipped when the
 * phone asks for reduced motion, and a video that fails or stalls never holds
 * the app back (SPLASH_MAX_MS).
 */
export function LaunchSplash({ onDone }: Readonly<{ onDone: () => void }>) {
  const opacity = useRef(new Animated.Value(1)).current;
  const finished = useRef(false);
  const player = useVideoPlayer(SPLASH_VIDEO, (p) => {
    p.muted = true;
    p.loop = false;
    p.play();
  });

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    hideNativeSplash();
    Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() =>
      onDone(),
    );
  }, [onDone, opacity]);

  useEffect(() => {
    const ended = player.addListener('playToEnd', finish);
    const failed = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') finish();
    });
    return () => {
      ended.remove();
      failed.remove();
    };
  }, [player, finish]);

  useEffect(() => {
    const timer = setTimeout(finish, SPLASH_MAX_MS);
    fireAndForget(
      AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
        if (reduce) finish();
      }),
      logs.mobileApp,
      SCOPE,
      'reduceMotion',
    );
    return () => clearTimeout(timer);
  }, [finish]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="launch-splash"
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        onFirstFrameRender={hideNativeSplash}
      />
    </Animated.View>
  );
}
