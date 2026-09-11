import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Confirmation shown after a host files a request to host in a new category. */
export function HostRequestSuccess() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { accent } = useThemeColors();

  const onDone = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('HostManage');
  };

  return (
    <YStack flex={1} testID="host-request-success">
      <AppBackground />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <YStack flex={1} alignItems="center" justifyContent="center" gap={16} padding={24}>
          <YStack
            width={72}
            height={72}
            borderRadius={36}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$soft"
          >
            <MaterialIcons name="check-circle" size={36} color={accent} />
          </YStack>
          <Text textAlign="center" fontSize={24} fontWeight="600" color="$color">
            Your Request Has Been Submitted
          </Text>
          <Text textAlign="center" fontSize={14} color="$muted">
            Thank you for expanding your hosting journey with Duncit. Our onboarding team will
            review your request for the new category and get in touch with you shortly. You{'’'}ll
            receive updates through Notifications and Email.
          </Text>
          <XStack
            testID="host-request-done"
            role="button"
            aria-label={t('mweb.surveyOnboarding.okay')}
            onPress={onDone}
            alignSelf="stretch"
            height={52}
            alignItems="center"
            justifyContent="center"
            borderRadius={999}
            backgroundColor="$primary"
            pressStyle={PRESS_STYLE.solid}
          >
            <Text fontSize={16} fontWeight="600" color="$onPrimary">
              Okay
            </Text>
          </XStack>
        </YStack>
      </SafeAreaView>
    </YStack>
  );
}
