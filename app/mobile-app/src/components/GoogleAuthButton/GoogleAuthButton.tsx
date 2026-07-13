import { useEffect } from 'react';
import { Image } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Text, XStack } from 'tamagui';

import { useConfigStore } from '@/stores/config.store';
import { useThemeStore } from '@/stores/theme.store';
import { fireAndForget } from '@/utils/fire-and-forget';

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
  onIdToken: (idToken: string) => void;
  onError?: (message: string) => void;
}

/**
 * Google sign-in via expo-auth-session (works in Expo Go — no native module).
 * Returns the Google id_token to the parent, which exchanges it with the
 * server's token-only `signupWithGoogle`/`loginWithGoogle`.
 */
export function GoogleAuthButton({
  label = 'Continue with Google',
  disabled,
  onIdToken,
  onError,
}: Readonly<GoogleAuthButtonProps>) {
  const scheme = useThemeStore((s) => s.scheme);
  const googleClientId = useConfigStore((s) => s.googleClientId);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) onIdToken(idToken);
      else onError?.('Google did not return an id token.');
    } else if (response.type === 'error') {
      onError?.(response.error?.message ?? 'Google sign-in failed.');
    }
    // Only react to a settled auth response; callbacks are stable enough here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const isDisabled = disabled || !request;

  return (
    <XStack
      testID="google-auth-button"
      role="button"
      aria-disabled={isDisabled}
      disabled={isDisabled}
      onPress={() => {
        if (!isDisabled) fireAndForget(promptAsync());
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
      pressStyle={{ opacity: 0.85 }}
    >
      <Image
        testID="google-auth-icon"
        source={scheme === 'dark' ? GOOGLE_G_DARK : GOOGLE_G_LIGHT}
        style={{ width: 20, height: 20 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Text fontSize={16} fontWeight="600" color="$color">
        {label}
      </Text>
    </XStack>
  );
}
