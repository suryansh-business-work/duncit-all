import Constants from 'expo-constants';

/**
 * The running app's version string — the RN twin of mWeb's `__APP_VERSION__`.
 * Sourced from the Expo runtime config with a safe default so the drawer footer
 * always shows a value. Kept in its own module (no icon/native imports) so its
 * branches stay unit-testable via a plain `expo-constants` mock.
 */
export function appVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}
