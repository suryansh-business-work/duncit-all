import type { ReactNode } from 'react';
import { YStack } from 'tamagui';

/**
 * The auth screens' ground.
 *
 * The flat `$background` ground is the design, not a fallback: with both admin
 * switches off it is all the screens draw, and it stays underneath the hero
 * (`AuthHero`, drawn in flow by `AuthScaffold`) so a slow or broken remote
 * asset never leaves a blank screen.
 */
export function AuthBackground({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <YStack flex={1} backgroundColor="$background" testID="auth-background">
      {children}
    </YStack>
  );
}
