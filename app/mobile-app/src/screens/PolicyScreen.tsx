import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { usePolicy } from '@/hooks/usePolicies';
import { useGoBack } from '@/hooks/useGoBack';
import { usePolicyPdf } from '@/hooks/usePolicyPdf';
import { AppBackground } from '@/components/AppBackground';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';
import { toErrorMessage } from '@/utils/errors';
import { stripHtml } from '@/utils/html';

/** Reader for a single public policy, opened from the sidebar's Policies group. */
export function PolicyScreen() {
  const goBack = useGoBack();
  const route = useRoute<RouteProp<RootStackParamList, 'Policy'>>();
  const slug = route.params?.slug ?? '';
  const { data, isLoading, error } = usePolicy(slug);
  const { download, busy } = usePolicyPdf();
  const { color: ink } = useThemeColors();
  const policy = data?.policyBySlug;

  return (
    <YStack flex={1} testID="policy-screen">
      <AppBackground />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <XStack alignItems="center" gap={8} paddingHorizontal={12} paddingVertical={8}>
          <XStack
            testID="policy-back"
            role="button"
            aria-label="Go back"
            onPress={goBack}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={20}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="arrow-back" size={22} color={ink} />
          </XStack>
          <Text numberOfLines={1} flex={1} fontSize={18} fontWeight="800" color="$color">
            {policy?.title ?? 'Policy'}
          </Text>
          <XStack
            testID="policy-pdf"
            role="button"
            aria-label="Download PDF"
            onPress={() => {
              if (!busy) download(slug).catch(() => undefined);
            }}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={20}
            opacity={busy ? 0.5 : 1}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="picture-as-pdf" size={22} color={ink} />
          </XStack>
        </XStack>

        {isLoading ? (
          <YStack flex={1} alignItems="center" justifyContent="center">
            <Spinner testID="policy-loading" color="$primary" />
          </YStack>
        ) : error ? (
          <Text testID="policy-error" paddingHorizontal={24} paddingVertical={32} color="$danger">
            {toErrorMessage(error)}
          </Text>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            <Text fontSize={15} lineHeight={24} color="$color">
              {stripHtml(policy?.content) || 'This policy has no content yet.'}
            </Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </YStack>
  );
}
