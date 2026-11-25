import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as ExpoVideo from 'expo-video';

import { LaunchSplashGate, SPLASH_MAX_MS } from '..';

/**
 * The launch video: the native splash stays until its first frame, it plays
 * once muted, and the app shows when it ends — or at once when it fails, when
 * the phone asks for reduced motion, or when it stalls past SPLASH_MAX_MS.
 */

const video = ExpoVideo as unknown as {
  __player: { muted: boolean; loop: boolean; play: jest.Mock };
  __emit: (event: string, payload?: unknown) => void;
  VideoView: (props: object) => unknown;
};
const hide = SplashScreen.hideAsync as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  // Run the fade at once so onDone is called synchronously.
  jest.spyOn(Animated, 'timing').mockReturnValue({
    start: (done?: Animated.EndCallback) => done?.({ finished: true }),
    stop: jest.fn(),
    reset: jest.fn(),
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function renderSplash() {
  const onDone = jest.fn();
  render(<LaunchSplashGate onDone={onDone} />);
  // Let the reduce-motion check resolve.
  await act(async () => {});
  return onDone;
}

it('plays the video once, muted, and keeps the native splash until its first frame', async () => {
  const onDone = await renderSplash();
  expect(video.__player).toMatchObject({ muted: true, loop: false });
  expect(video.__player.play).toHaveBeenCalledTimes(1);
  expect(hide).not.toHaveBeenCalled();

  // The splash is hidden from screen readers, so its parts are queried with hidden elements.
  act(() =>
    screen.getByTestId('video-view', { includeHiddenElements: true }).props.onFirstFrameRender(),
  );
  expect(hide).toHaveBeenCalledTimes(1);
  expect(onDone).not.toHaveBeenCalled();
});

it('shows the app when the video ends, once', async () => {
  const onDone = await renderSplash();
  act(() => {
    video.__emit('playToEnd');
    video.__emit('playToEnd');
  });
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(hide).toHaveBeenCalled();
});

it('shows the app at once when the video cannot play', async () => {
  const onDone = await renderSplash();
  act(() => video.__emit('statusChange', { status: 'loading' }));
  expect(onDone).not.toHaveBeenCalled();
  act(() => video.__emit('statusChange', { status: 'error' }));
  expect(onDone).toHaveBeenCalledTimes(1);
});

it('never holds the app back longer than the safety limit', async () => {
  const onDone = await renderSplash();
  act(() => jest.advanceTimersByTime(SPLASH_MAX_MS - 1));
  expect(onDone).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(onDone).toHaveBeenCalledTimes(1);
});

it('skips the video when the phone asks for reduced motion', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const onDone = await renderSplash();
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(hide).toHaveBeenCalled();
});

it('gets out of the way, with the native splash hidden, when the video surface itself crashes', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(video, 'VideoView').mockImplementation(() => {
    throw new Error('no video decoder');
  });
  const onDone = await renderSplash();
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(hide).toHaveBeenCalled();
  expect(screen.queryByTestId('launch-splash', { includeHiddenElements: true })).toBeNull();
});
