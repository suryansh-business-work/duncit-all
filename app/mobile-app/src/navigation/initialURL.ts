import { Linking as RNLinking } from 'react-native';
import * as Linking from 'expo-linking';

/** How long React Native's own answer may take before the app opens without a link. */
export const NATIVE_INITIAL_URL_TIMEOUT_MS = 1000;

/**
 * The URL that launched the app, for React Navigation's first state.
 *
 * React Navigation's default asks React Native's `Linking.getInitialURL()` and
 * gives up after 150 ms. On iOS that call is answered on the main queue, which
 * is still busy laying out the first screens when the navigator mounts, so the
 * deadline passes and a link that cold-started the app opens Home instead of
 * its page. Android answers off the main thread, which is why it never showed
 * there.
 *
 * expo-linking records the launch URL natively (openURL / universal-link
 * activity on iOS, the launch intent on Android) and reads it back
 * synchronously, so there is no race. It is cleared once read: the native
 * value is "the last URL the OS delivered", and a navigator remounted later
 * would otherwise replay a link (or a sign-in redirect) from mid-session.
 * React Native's answer stays as the fallback, with a deadline long enough
 * for a busy main queue.
 */
export async function getInitialURL(): Promise<string | null> {
  const recorded = Linking.getLinkingURL();
  if (recorded) {
    Linking.clearInitialURL();
    return recorded;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), NATIVE_INITIAL_URL_TIMEOUT_MS);
  });
  try {
    return await Promise.race([RNLinking.getInitialURL(), deadline]);
  } finally {
    clearTimeout(timer);
  }
}
