import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

const LOGO = require('../../../assets/duncit-logo.png');

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * The sign-in screens' frame: the CRM's indigo band with the Duncit logo and
 * "Duncit CRM", and a card holding the step. Deliberately unlike the member
 * app's red sign-in, so nobody confuses the work app with the member app.
 */
export function AuthLayout({ title, subtitle, children }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack backgroundColor="$primary" paddingTop="$8" paddingBottom="$9" paddingHorizontal="$5" alignItems="center" gap="$2">
        <Image source={LOGO} style={{ width: 72, height: 72 }} resizeMode="contain" accessibilityIgnoresInvertColors accessible={false} />
        <Text color="$onPrimary" fontSize="$8" fontWeight="800" role="heading">
          {t('crmApp.login.title')}
        </Text>
      </YStack>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
          <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
            <YStack
              marginTop="$-6"
              marginHorizontal="$4"
              backgroundColor="$surface"
              borderRadius="$6"
              padding="$5"
              gap="$3"
              borderWidth={1}
              borderColor="$borderColor"
              elevation={4}
            >
              <Text fontSize="$7" fontWeight="700" role="heading">
                {title}
              </Text>
              {subtitle ? <Text color="$muted">{subtitle}</Text> : null}
              {children}
            </YStack>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </YStack>
  );
}
