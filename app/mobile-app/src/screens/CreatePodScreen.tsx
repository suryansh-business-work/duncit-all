import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { CreatePodStepper } from '@/components/create-pod';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StackScreen } from '@/components/StackScreen';
import { useCreatePod } from '@/hooks/useCreatePod';
import { useHomeStore } from '@/stores/home.store';
import type { RootStackParamList } from '@/navigation/types';

/** Host-only Create Pod screen — reached from the Home "+" button or by resuming
 * a draft from Host Management. The draft autosaves; finishing the last step
 * publishes the pod, refreshes the feed and lands the host on Hosts Management. */
export function CreatePodScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreatePod'>>();
  const {
    isHost,
    viewerUserId,
    clubs,
    locations,
    venues,
    products,
    hostCategories,
    finance,
    isLoading,
    initialValues,
    initialStep,
    initialDraftId,
    saveDraft,
    moderate,
    publish,
  } = useCreatePod(route.params?.draftId);

  return (
    <StackScreen title="Create a Pod" testID="create-pod-screen">
      {isLoading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner testID="create-pod-loading" color="$primary" />
        </YStack>
      ) : null}
      {!isLoading && !isHost ? (
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
      {!isLoading && isHost ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Reveal>
            <CreatePodStepper
              initialValues={initialValues}
              initialStep={initialStep}
              initialDraftId={initialDraftId}
              clubs={clubs}
              locations={locations}
              venues={venues}
              products={products}
              hostCategories={hostCategories}
              viewerUserId={viewerUserId}
              finance={finance}
              onSaveDraft={saveDraft}
              onModerate={moderate}
              onPublish={async (id, input) => {
                await publish(id, input);
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
