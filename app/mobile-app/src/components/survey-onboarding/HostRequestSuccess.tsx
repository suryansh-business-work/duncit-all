import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

/** Confirmation shown after a host files a request to host in a new category. */
export function HostRequestSuccess() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { color: ink } = useThemeColors();

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
        <YStack flex={1} alignItems="center" justifyContent="center" gap={14} padding={24}>
          <MaterialIcons name="check-circle" size={56} color={ink} />
          <Text textAlign="center" fontSize={22} fontWeight="900" color={ink}>
            Your Request Has Been Submitted
          </Text>
          <Text textAlign="center" fontSize={14.5} color={ink} opacity={0.85}>
            Thank you for expanding your hosting journey with Duncit. Our onboarding team will
            review your request for the new category and get in touch with you shortly. You{'’'}ll
            receive updates through Notifications and Email.
          </Text>
          <XStack
            testID="host-request-done"
            role="button"
            aria-label="Okay"
            onPress={onDone}
            paddingHorizontal={22}
            paddingVertical={12}
            borderRadius={999}
            backgroundColor="$primary"
            pressStyle={{ opacity: 0.85 }}
          >
            <Text fontSize={14.5} fontWeight="900" color="$onPrimary">
              Okay
            </Text>
          </XStack>
        </YStack>
      </SafeAreaView>
    </YStack>
  );
}
