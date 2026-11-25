import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

import { INK, RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthBackdrop } from './AuthBackdrop';
import { AuthCardHeader } from './AuthCardHeader';
import { AuthLegalLinks } from './AuthLegalLinks';
import { ColorModeToggle } from './ColorModeToggle';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * The sign-in screens' frame, built to the CRM portal's login card: the CRM
 * photo blurred behind a scrim, the light/dark switch, a glass card with the
 * Duncit mark, "duncit.com" and the CRM chip, the step itself and the legal
 * links, and the ink tagline bar under the card.
 */
export function AuthLayout({ title, subtitle, children }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <AuthBackdrop>
      <SafeAreaView style={{ flex: 1 }}>
        <XStack justifyContent="flex-end" paddingHorizontal="$3" paddingTop="$2">
          <ColorModeToggle />
        </XStack>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }}
          >
            <YStack gap="$3" width="100%" maxWidth={420} alignSelf="center">
              <YStack
                backgroundColor="$glass"
                borderRadius={RADII.lg}
                borderWidth={1}
                borderColor="$borderColor"
                padding="$5"
                gap="$3"
                shadowColor="$shadowColor"
                shadowOpacity={0.18}
                shadowRadius={30}
                shadowOffset={{ width: 0, height: 20 }}
                elevation={6}
              >
                <AuthCardHeader />
                <Text fontSize="$9" fontWeight="800" role="heading">
                  {title}
                </Text>
                {subtitle ? <Text color="$muted">{subtitle}</Text> : null}
                {children}
                <AuthLegalLinks />
              </YStack>
              <YStack
                backgroundColor={INK.fill}
                borderRadius={RADII.lg}
                paddingHorizontal="$4"
                paddingVertical="$3"
                testID="auth-tagline"
              >
                <Text color={INK.on} fontWeight="700" textAlign="center">
                  {t('shell.portal.crm.tagline')}
                </Text>
              </YStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuthBackdrop>
  );
}
