import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import { PodHistoryCard } from '@/components/pod-history';
import { StackScreen } from '@/components/StackScreen';
import { usePodHistory } from '@/hooks/usePodHistory';
import type { RootStackParamList } from '@/navigation/types';
import { toErrorMessage } from '@/utils/errors';

/** Pod History — the pods the user has joined. Tapping a card opens its details,
 * actions, refund status and timeline. RN twin of mWeb's PodHistoryPage. */
export function PodHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { uniqueItems, isLoading, error } = usePodHistory();

  return (
    <StackScreen title="Pod History" testID="pod-history-screen">
      {isLoading && uniqueItems.length === 0 ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner testID="pod-history-loading" color="$primary" />
        </YStack>
      ) : error ? (
        <Text testID="pod-history-error" padding={24} color="$danger">
          {toErrorMessage(error)}
        </Text>
      ) : uniqueItems.length === 0 ? (
        <Text testID="pod-history-empty" padding={24} color="$muted">
          Pods you have joined will appear here.
        </Text>
      ) : (
        <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 10 }}>
          <YStack gap={2} marginBottom={4}>
            <Text fontSize={20} fontWeight="900" color="$color">
              Joined Pods
            </Text>
            <Text fontSize={13} color="$muted">
              Tap any pod you joined to view details, actions, refund status, and timeline.
            </Text>
          </YStack>
          {uniqueItems.map((item) => (
            <PodHistoryCard
              key={item.id}
              item={item}
              onPress={() => navigation.navigate('PodHistoryDetails', { membershipId: item.id })}
            />
          ))}
        </ScrollView>
      )}
    </StackScreen>
  );
}
