import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { CreatePodStepper } from '@/components/create-pod';
import { PodVenueApproval } from '@/generated/graphql/graphql';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StackScreen } from '@/components/StackScreen';
import { useCreatePod } from '@/hooks/useCreatePod';
import { useTranslation } from '@/hooks/useTranslation';
import { useHomeStore } from '@/stores/home.store';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

/** Host-only Create Pod screen — reached from the Home "+" button or by resuming
 * a draft from Host Management. The draft autosaves; finishing the last step
 * publishes the pod, refreshes the feed and lands the host on Hosts Management —
 * or on the venue-approval waiting screen when the slot request is PENDING. */
export function CreatePodScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RootStackParamList, 'CreatePod'>>();
  const {
    isHost,
    viewerUserId,
    clubs,
    locations,
    venues,
    products,

    subCategories,
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
    <StackScreen title={t('mweb.createPod.title')} testID="create-pod-screen">
      {isLoading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner testID="create-pod-loading" color="$primary" />
        </YStack>
      ) : null}
      {!isLoading && !isHost ? (
        <YStack flex={1} alignItems="center" justifyContent="center" gap={14} padding={24}>
          <Text testID="create-pod-not-host" textAlign="center" color="$muted">
            {t('mweb.createPod.hostRequired')}
          </Text>
          <PrimaryButton
            testID="create-pod-become-host"
            label={t('mweb.createPod.becomeHost')}
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
              subCategories={subCategories}
              hostCategories={hostCategories}
              viewerUserId={viewerUserId}
              finance={finance}
              onSaveDraft={saveDraft}
              onModerate={moderate}
              onPublish={async (id, input) => {
                const created = await publish(id, input);
                fireAndForget(useHomeStore.getState().fetch(true));
                // A pod holding a venue slot awaits the venue's decision — land
                // the host on the waiting screen instead of Host Management.
                if (created.venue_approval_status === PodVenueApproval.Pending) {
                  navigation.replace('PodPending', { podId: created.id });
                } else {
                  navigation.replace('HostManage');
                }
              }}
            />
          </Reveal>
        </ScrollView>
      ) : null}
    </StackScreen>
  );
}
