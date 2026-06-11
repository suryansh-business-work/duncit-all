import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { CreatePodFormView } from '@/components/create-pod';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StackScreen } from '@/components/StackScreen';
import { useCreatePod } from '@/hooks/useCreatePod';
import { useHomeStore } from '@/stores/home.store';
import type { RootStackParamList } from '@/navigation/types';

/** Host-only Create Pod screen — reached from the Home "+" floating button.
 * Submits via createPartnerPod; on success the feed refreshes and the host
 * lands on Hosts Management. */
export function CreatePodScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isApprovedHost, clubs, venues, isLoading, create } = useCreatePod();

  return (
    <StackScreen title="Create a Pod" testID="create-pod-screen">
      {isLoading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner testID="create-pod-loading" color="$primary" />
        </YStack>
      ) : null}
      {!isLoading && !isApprovedHost ? (
        <YStack flex={1} alignItems="center" justifyContent="center" gap={14} padding={24}>
          <Text testID="create-pod-not-host" textAlign="center" color="$muted">
            An approved host profile is required before creating pods.
          </Text>
          <PrimaryButton
            testID="create-pod-become-host"
            label="Become a host"
            onPress={() => navigation.navigate('BecomeHost')}
          />
        </YStack>
      ) : null}
      {!isLoading && isApprovedHost ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Reveal>
            <CreatePodFormView
              clubs={clubs}
              venues={venues}
              onSubmit={async (values) => {
                await create(values);
                void useHomeStore.getState().fetch(true);
                navigation.replace('HostManage');
              }}
            />
          </Reveal>
        </ScrollView>
      ) : null}
    </StackScreen>
  );
}
