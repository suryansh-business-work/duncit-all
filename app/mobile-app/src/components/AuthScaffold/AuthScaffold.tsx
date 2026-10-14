import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, YStack } from 'tamagui';
import { auth } from '@duncit/auth-tokens';

import { AuthBackground, useAuthHeroHeight, useAuthHeroMedia } from '@/components/AuthBackground';
import { AuthLogo } from '@/components/AuthLogo';
import { AuthModeToggle } from '@/components/AuthModeToggle';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { TwoToneHeading } from '@/components/TwoToneHeading';

export interface AuthScaffoldProps {
  title: string;
  /** The second beat ("back!" in "Welcome back!"), on its own line in the red text accent. */
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
 * Shared auth screen layout — the admin's hero across the top, then the logo
 * and a large left-aligned two-line headline over its lower half, then the
 * screen content, in a ~420px column on the flat auth ground. mWeb twin: AuthBackground +
 * AuthScreenFrame + AuthHeading.
 */
export function AuthScaffold({
  title,
  accentWord,
  subtitle,
  children,
  testID,
}: Readonly<AuthScaffoldProps>) {
  const { hasHero } = useAuthHeroMedia();
  const heroHeight = useAuthHeroHeight();
  // With a hero the column starts over its lower half; without one the flat
  // ground keeps the form centred.
  const top = hasHero ? Math.round(heroHeight * auth.hero.contentStart) : 40;
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
              justifyContent: hasHero ? 'flex-start' : 'center',
              paddingHorizontal: 24,
              paddingTop: top,
              paddingBottom: 40,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <YStack width="100%" maxWidth={420} alignSelf="center">
              <YStack alignItems="flex-start" gap={10}>
                <YStack marginBottom={8}>
                  <AuthLogo size={64} />
                </YStack>
                <TwoToneHeading
                  lead={title}
                  trail={accentWord}
                  trailTone="accent"
                  stacked
                  fontSize={40}
                  align="left"
                />
                {subtitle ? (
                  <Text maxWidth={360} fontSize={16} color="$muted">
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
