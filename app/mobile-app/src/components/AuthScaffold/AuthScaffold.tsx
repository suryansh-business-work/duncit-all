import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, YStack } from 'tamagui';

import { AuthBackground } from '@/components/AuthBackground';
import { AuthLogo } from '@/components/AuthLogo';
import { AuthModeToggle } from '@/components/AuthModeToggle';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { TwoToneHeading } from '@/components/TwoToneHeading';

export interface AuthScaffoldProps {
  title: string;
  /** Optional softer second beat (e.g. "back." in "Welcome back."), drawn muted. */
  accentWord?: string;
  /**
   * Only a line that carries something the person needs ("you've been signed
   * out everywhere", "you can only do this once") — never a tagline.
   */
  subtitle?: string;
  children: ReactNode;
  testID?: string;
}

/**
 * Shared auth screen layout — the flat auth ground with the form sitting
 * directly on it (no card) → the admin logo → one calm two-tone headline →
 * screen content, in a ~420px centred column. mWeb twin: AuthBackground +
 * AuthScreenFrame + AuthHeading.
 */
export function AuthScaffold({
  title,
  accentWord,
  subtitle,
  children,
  testID,
}: Readonly<AuthScaffoldProps>) {
  return (
    <AuthBackground>
      <SafeAreaView style={{ flex: 1 }} testID={testID}>
        {/* The keyboard shrinks the scroll viewport so the centered form lifts
            above it — otherwise (Android edge-to-edge) the lower fields
            (Password / Confirm Password) stay hidden behind the keyboard. */}
        <KeyboardScreen>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              paddingHorizontal: 24,
              paddingVertical: 40,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <YStack width="100%" maxWidth={420} alignSelf="center">
              <YStack alignItems="center" gap={8}>
                <YStack marginBottom={8}>
                  <AuthLogo size={64} />
                </YStack>
                <TwoToneHeading lead={title} trail={accentWord} fontSize={28} align="center" />
                {subtitle ? (
                  <Text maxWidth={320} textAlign="center" fontSize={14} color="$muted">
                    {subtitle}
                  </Text>
                ) : null}
              </YStack>
              <YStack marginTop={24} gap={16}>
                {children}
              </YStack>
              {/* Last thing on the screen, on every auth screen: a signed-out
                  person cannot reach the sidebar switch, and this is the choice
                  that decides whether the copy over an admin's backdrop reads. */}
              <YStack marginTop={24}>
                <AuthModeToggle />
              </YStack>
            </YStack>
          </ScrollView>
        </KeyboardScreen>
      </SafeAreaView>
    </AuthBackground>
  );
}
