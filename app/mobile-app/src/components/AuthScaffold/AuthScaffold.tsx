import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, YStack } from 'tamagui';
import { auth } from '@duncit/auth-tokens';

import { AuthBackground } from '@/components/AuthBackground';
import { AuthLogo } from '@/components/AuthLogo';
import { KeyboardScreen } from '@/components/KeyboardScreen';

export interface AuthScaffoldProps {
  title: string;
  /** Optional accent-coloured trailing word (e.g. "back." in "Welcome back."). */
  accentWord?: string;
  subtitle: string;
  children: ReactNode;
  testID?: string;
}

/**
 * Shared auth screen layout — full-screen gradient backdrop with the form sitting
 * directly on it (no card/box) → shared brand logo → heading + subtitle → screen
 * content. All brand surfaces resolve from @duncit/auth-tokens.
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
            <YStack width="100%" maxWidth={460} alignSelf="center">
              <YStack alignItems="center" gap={8}>
                <AuthLogo />
                <Text textAlign="center" fontSize={30} fontWeight="900" color="$color">
                  {title}
                  {accentWord ? <Text color={auth.accent}> {accentWord}</Text> : null}
                </Text>
                <Text maxWidth={300} textAlign="center" fontSize={14} color="$muted">
                  {subtitle}
                </Text>
              </YStack>
              <YStack marginTop={20} gap={16}>
                {children}
              </YStack>
            </YStack>
          </ScrollView>
        </KeyboardScreen>
      </SafeAreaView>
    </AuthBackground>
  );
}
