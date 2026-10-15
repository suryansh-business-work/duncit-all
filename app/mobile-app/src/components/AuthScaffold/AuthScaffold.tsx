import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { auth, radii } from '@duncit/auth-tokens';

import { AuthBackground, AuthHero, useAuthHeroMedia } from '@/components/AuthBackground';
import { AuthModeToggle } from '@/components/AuthModeToggle';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { AuthHeading } from './AuthHeading';
import { useAuthFit } from './useAuthFit';

const FIT = auth.fit;
/** The column every auth screen reads in. */
const COLUMN_MAX_WIDTH = 420;
/** The hero runs under the status bar; the top inset is spent as hero room instead. */
const EDGES = ['left', 'right', 'bottom'] as const;

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
 * Shared auth screen layout — the admin's hero across the top with the square
 * logo and a large left-aligned two-line headline on its darkened foot, then
 * the screen content on the ground, which rises over the photo with rounded
 * top corners. Without a hero, the same column on the flat ground, centred.
 *
 * Sized to the window (`useAuthFit`), so the login landing fits a phone
 * without scrolling; the ScrollView stays for what cannot fit — a very short
 * window, a large accessibility font, the keyboard. mWeb twin: AuthBackground
 * + AuthScreenFrame + AuthHeading.
 */
export function AuthScaffold({
  title,
  accentWord,
  subtitle,
  children,
  testID,
}: Readonly<AuthScaffoldProps>) {
  const { hasHero } = useAuthHeroMedia();
  const { top } = useSafeAreaInsets();
  const { size } = useAuthFit();
  const gap = size(FIT.gap);
  // The ground's rounded top overlaps the scrim by its own radius.
  const overlap = hasHero ? radii.xl : 0;
  return (
    <AuthBackground>
      <SafeAreaView style={{ flex: 1 }} edges={EDGES} testID={testID}>
        {/* The keyboard shrinks the scroll viewport so the form lifts above
            it — otherwise (Android edge-to-edge) the lower fields stay hidden
            behind the keyboard. */}
        <KeyboardScreen>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: hasHero ? 'flex-start' : 'center',
              paddingBottom: gap,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <AuthHero room={top + size(FIT.heroRoom)}>
              <YStack
                width="100%"
                maxWidth={COLUMN_MAX_WIDTH + 2 * FIT.gap}
                alignSelf="center"
                paddingHorizontal={FIT.gap}
                paddingTop={hasHero ? 0 : top + gap}
                paddingBottom={overlap + gap}
              >
                <AuthHeading title={title} accentWord={accentWord} subtitle={subtitle} />
              </YStack>
            </AuthHero>
            <YStack
              marginTop={-overlap}
              borderTopLeftRadius={overlap}
              borderTopRightRadius={overlap}
              backgroundColor="$background"
              paddingHorizontal={FIT.gap}
              paddingTop={hasHero ? gap : 0}
            >
              <YStack width="100%" maxWidth={COLUMN_MAX_WIDTH} alignSelf="center">
                <YStack gap={size(FIT.gap * (2 / 3))}>{children}</YStack>
                {/* Last thing on the screen, on every auth screen: a signed-out
                    person cannot reach the sidebar switch, and this is the
                    choice that decides how the screen reads. */}
                <YStack marginTop={gap}>
                  <AuthModeToggle />
                </YStack>
              </YStack>
            </YStack>
          </ScrollView>
        </KeyboardScreen>
      </SafeAreaView>
    </AuthBackground>
  );
}
