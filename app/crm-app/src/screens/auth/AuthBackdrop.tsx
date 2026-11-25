import type { ReactNode } from 'react';
import { ImageBackground, StyleSheet } from 'react-native';
import { YStack } from 'tamagui';

import { config } from '@/constants/config';

/** Soft enough to read as a backdrop, sharp enough to still show the scene — the portal's blur. */
const BACKDROP_BLUR = 3;

/**
 * The portal login screen's backdrop: the CRM photo, blurred, under a scrim of
 * the page colour so the card and its text stay readable in light and dark.
 * Without a network the photo is simply missing and the page colour shows.
 */
export function AuthBackdrop({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <YStack flex={1} backgroundColor="$background">
      <ImageBackground
        source={{ uri: config.loginImage }}
        blurRadius={BACKDROP_BLUR}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
        accessible={false}
        testID="auth-backdrop"
      />
      <YStack position="absolute" top={0} right={0} bottom={0} left={0} backgroundColor="$scrim" />
      {children}
    </YStack>
  );
}
