import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Spinner, Text, XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { useConfigStore } from '@/stores/config.store';
import { useThemeStore } from '@/stores/theme.store';
import { PRESS_STYLE } from '@duncit/buttons-native';

// Official Google "G" marks (from the Google sign-in branding kit). The light
// mark sits on a white tile, the dark mark on a dark tile, so each blends into
// our themed button surface — keeping the logo on-brand without altering it.
const GOOGLE_G_LIGHT = require('../../assets/google-signin-assets/google-g-light.png');
const GOOGLE_G_DARK = require('../../assets/google-signin-assets/google-g-dark.png');

// Finishes the auth session if the app was opened via the OAuth redirect.
WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthButtonProps {
  label?: string;
  disabled?: boolean;
  /**
   * The parent's half of the wait: it is still spending the id_token on the
   * server when this button has already finished its own job. Without it the
   * screen goes quiet between Google returning and the session opening, which
   * is the longest part and the part that looks broken.
   */
  loading?: boolean;
  onIdToken: (idToken: string) => void;
  onError?: (message: string) => void;
}

/**
 * Google sign-in via expo-auth-session (works in Expo Go — no native module).
 * Returns the Google id_token to the parent, which exchanges it with the
 * server's token-only `signupWithGoogle`/`loginWithGoogle`.
 */
export function GoogleAuthButton({
  label,
  disabled,
  loading,
  onIdToken,
  onError,
}: Readonly<GoogleAuthButtonProps>) {
  const { t } = useTranslation();
  const scheme = useThemeStore((s) => s.scheme);
  const googleClientId = useConfigStore((s) => s.googleClientId);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId,
  });
  /*
    True from the tap until Google settles. `promptAsync` hands the person to a
    browser and resolves only once they come back — seconds during which the
    app was showing an idle button, so the tap read as ignored and people tapped
    it again.
  */
  const [prompting, setPrompting] = useState(false);

  useEffect(() => {
    if (!response) return;
    // Settled, whichever way it went: dismissed and cancelled end the wait just
    // as a success does, and leaving the spinner up after one would strand the
    // screen on a button that can no longer be pressed.
    setPrompting(false);
    if (response.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) onIdToken(idToken);
      else onError?.(t('mweb.auth.googleNoIdToken'));
    } else if (response.type === 'error') {
      onError?.(response.error?.message ?? t('mweb.auth.googleFailed'));
    }
    // Only react to a settled auth response; callbacks are stable enough here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const busy = prompting || loading === true;
  const isDisabled = disabled || busy || !request;
  // Decided above the JSX (S3358): the label says which of the two waits is
  // running, so the button never sits there reading "Continue with Google"
  // beside a spinner.
  const busyLabel = busy
    ? t('mweb.auth.googleConnecting')
    : (label ?? t('mweb.auth.googleContinue'));

  return (
    <XStack
      testID="google-auth-button"
      role="button"
      aria-disabled={isDisabled}
      disabled={isDisabled}
      onPress={() => {
        if (isDisabled) return;
        setPrompting(true);
        // A rejected prompt never reaches the response effect, so the spinner
        // is cleared here too — otherwise a browser that refuses to open
        // leaves the button spinning with nothing behind it.
        promptAsync()
          .catch(() => {
            onError?.(t('mweb.auth.googleFailed'));
          })
          .finally(() => setPrompting(false));
      }}
      alignItems="center"
      justifyContent="center"
      gap={12}
      width="100%"
      height={52}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      opacity={isDisabled ? 0.6 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      {busy ? (
        <Spinner testID="google-auth-spinner" color="$primary" />
      ) : (
        <Image
          testID="google-auth-icon"
          source={scheme === 'dark' ? GOOGLE_G_DARK : GOOGLE_G_LIGHT}
          style={{ width: 20, height: 20 }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      )}
      <Text fontSize={16} fontWeight="600" color="$color">
        {busyLabel}
      </Text>
    </XStack>
  );
}
