import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Spinner, Text, XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { useConfigStore } from '@/stores/config.store';
import { useThemeStore } from '@/stores/theme.store';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { readGoogleIdToken } from './googleIdToken';

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
  const googleAndroidClientId = useConfigStore((s) => s.googleAndroidClientId);
  const googleIosClientId = useConfigStore((s) => s.googleIosClientId);
  // Each platform signs in as its own client: Google refuses the app's
  // `com.duncit.mobile:/oauthredirect` on the Web client. A blank native id
  // (undefined, not '') lets the library fall back to `clientId`.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId,
    webClientId: googleClientId,
    androidClientId: googleAndroidClientId || undefined,
    iosClientId: googleIosClientId || undefined,
    // readGoogleIdToken exchanges the native code, with an error path the
    // library's own exchange lacks. Both at once would spend the code twice.
    shouldAutoExchangeCode: false,
  });
  /*
    True from the tap until Google settles. `promptAsync` hands the person to a
    browser and resolves only once they come back — seconds during which the
    app was showing an idle button, so the tap read as ignored and people tapped
    it again.
  */
  const [prompting, setPrompting] = useState(false);

  useEffect(() => {
    if (!response) return undefined;
    // Settled, whichever way it went: dismissed and cancelled end the wait just
    // as a success does, and leaving the spinner up after one would strand the
    // screen on a button that can no longer be pressed.
    if (response.type !== 'success') {
      setPrompting(false);
      if (response.type === 'error') {
        onError?.(response.error?.message ?? t('mweb.auth.googleFailed'));
      }
      return undefined;
    }
    // A native success still has a code to exchange, so the spinner stays up
    // until the token is in hand (or the exchange has failed).
    let live = true;
    readGoogleIdToken(response, request)
      .then((idToken) => {
        if (!live) return;
        if (idToken) onIdToken(idToken);
        else onError?.(t('mweb.auth.googleNoIdToken'));
      })
      .catch(() => {
        if (live) onError?.(t('mweb.auth.googleFailed'));
      })
      .finally(() => {
        if (live) setPrompting(false);
      });
    return () => {
      live = false;
    };
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
      aria-busy={busy}
      // One screen-reader element named by its visible words (native), and a
      // tab stop (web).
      tabIndex={0}
      disabled={isDisabled}
      onPress={() => {
        if (isDisabled) return;
        setPrompting(true);
        promptAsync()
          .then((result) => {
            /*
              A SUCCESS is left spinning on purpose: the effect below clears it
              in the same breath as handing the token to the parent, which
              starts its own wait. Clearing it here would let the button go idle
              and pressable for the frame between the two.

              Every other outcome ends here, because nothing follows it.
            */
            if (result.type !== 'success') setPrompting(false);
          })
          .catch(() => {
            // A prompt that never opened reaches no response, so this is the
            // only place the spinner can be cleared for it.
            setPrompting(false);
            onError?.(t('mweb.auth.googleFailed'));
          });
      }}
      alignItems="center"
      justifyContent="center"
      gap={12}
      width="100%"
      height={52}
      borderRadius={999}
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
