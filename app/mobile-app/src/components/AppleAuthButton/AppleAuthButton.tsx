import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Spinner, Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import type { SocialCredential } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useConfigStore } from '@/stores/config.store';
import { appleRouteForPlatform, signInWithApple } from './appleSignIn';

// The web build's auth session finishes in a popup that loads the app — this
// hands its URL back to the page that opened it.
WebBrowser.maybeCompleteAuthSession();

export interface AppleAuthButtonProps {
  /** Sign in on the login screen, sign up on signup. */
  label: string;
  /** The parent's half of the wait: it is still spending the id_token. */
  loading?: boolean;
  onCredential: (credential: SocialCredential) => void;
  onError: (message: string) => void;
}

/**
 * Sign in with Apple — Apple's black pill (white on a dark theme) with its
 * logo, per Apple's button guidelines, beside Google's. The same button on
 * every platform; how it signs in underneath is `signInWithApple`'s.
 *
 * Renders nothing until the Tech portal holds what this platform needs — the
 * App ID on iOS, the Services ID and relay on Android and web. Backing out of
 * Apple is a cancel and says nothing. mWeb twin:
 * app/mweb/src/components/apple-sign-in/AppleSignInButton.tsx.
 */
export function AppleAuthButton({
  label,
  loading,
  onCredential,
  onError,
}: Readonly<AppleAuthButtonProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const bundleId = useConfigStore((s) => s.appleBundleId);
  const servicesId = useConfigStore((s) => s.appleServicesId);
  const relayUrl = useConfigStore((s) => s.appleRelayUrl);
  const [prompting, setPrompting] = useState(false);

  const configured = appleRouteForPlatform() === 'NATIVE' ? !!bundleId : !!servicesId && !!relayUrl;
  if (!configured) return null;

  const busy = prompting || loading === true;

  const press = () => {
    if (busy) return;
    setPrompting(true);
    signInWithApple({ servicesId, relayUrl })
      .then((credential) => {
        if (credential) onCredential(credential);
      })
      .catch(() => onError(t('mweb.auth.appleFailed')))
      .finally(() => setPrompting(false));
  };

  return (
    <XStack
      testID="apple-auth-button"
      role="button"
      aria-disabled={busy}
      aria-busy={busy}
      tabIndex={0}
      disabled={busy}
      onPress={press}
      alignItems="center"
      justifyContent="center"
      gap={12}
      width="100%"
      height={52}
      borderRadius={999}
      // Apple's own contrast: the theme's ink as the fill, its ground as the
      // label — black on a light theme, white on a dark one.
      backgroundColor="$color"
      opacity={busy ? 0.6 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      {busy ? (
        <Spinner testID="apple-auth-spinner" color="$background" />
      ) : (
        <Ionicons name="logo-apple" size={20} color={colors.background} />
      )}
      <Text fontSize={16} fontWeight="600" color="$background">
        {busy ? t('mweb.auth.appleConnecting') : label}
      </Text>
    </XStack>
  );
}
