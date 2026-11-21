import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { clubCityName, type DraftAutosaveHandle } from '@duncit/utils';

import { CreatePodStepper } from '@/components/create-pod';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DraftSaveIndicator } from '@/components/create-pod/DraftSaveIndicator';
import { HostAgainNotice } from '@/components/create-pod/HostAgainNotice';
import { useCreatePodDraftId } from '@/hooks/useCreatePodDraftId';
import { useDraftLeaveGuard } from '@/hooks/useDraftLeaveGuard';
import { PodVenueApproval } from '@/generated/graphql/graphql';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StackScreen } from '@/components/StackScreen';
import { useCreatePod } from '@/hooks/useCreatePod';
import { useTranslation } from '@/hooks/useTranslation';
import { useHomeStore } from '@/stores/home.store';
import type { RootStackParamList } from '@/navigation/types';
import { challengeRequired } from '@/services/challenge-setup';
import { fireAndForget } from '@/utils/fire-and-forget';
import { RefreshScrollView } from '@/components/PullToRefresh';

/** Host-only Create Pod screen — reached from the Home "+" button, by resuming
 * a draft from Host Management, or by "Host again" on one of the host's pods.
 * Every visit is one draft whose id is in the route params from the start; it
 * autosaves, shows its save state in the header corner, and is saved before the
 * host leaves. Finishing the last step publishes the pod, refreshes the feed and
 * lands the host on Hosts Management — or on the venue-approval waiting screen
 * when the slot request is PENDING. */
export function CreatePodScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RootStackParamList, 'CreatePod'>>();
  const draftId = useCreatePodDraftId();
  const [autosave, setAutosave] = useState<DraftAutosaveHandle | null>(null);
  const leaveGuard = useDraftLeaveGuard(autosave);
  const {
    isHost,
    viewerUserId,
    clubs,
    locations,
    venues,
    products,

    subCategories,
    categoryIcons,
    hostCategories,
    finance,
    isLoading,
    initialValues,
    initialStep,
    initialDraftId,
    hostAgain,
    selectedLocationId,
    pinnedVenueId,
    pickedVenueId,
    loadFailed,
    retry,
    saveDraft,
    moderate,
    publish,
  } = useCreatePod(
    draftId,
    route.params?.partnerRequestId,
    route.params?.hostAgainPodId,
    route.params?.pickVenueId,
  );
  const ready = !isLoading && !loadFailed;
  const copied = hostAgain === 'failed' ? null : hostAgain;
  // A copy keeps its own city; when that is not the header's, the notice names it.
  const otherCity =
    copied && initialValues.location_id !== selectedLocationId
      ? locations.find((item) => item.id === initialValues.location_id)
      : undefined;

  return (
    <StackScreen
      title={t('mweb.createPod.title')}
      testID="create-pod-screen"
      right={<DraftSaveIndicator status={autosave?.status ?? 'idle'} />}
    >
      {isLoading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner
            role="progressbar"
            aria-label={t('mweb.a11y.loading')}
            testID="create-pod-loading"
            color="$primary"
          />
        </YStack>
      ) : null}
      {!isLoading && loadFailed ? (
        <YStack flex={1} alignItems="center" justifyContent="center" gap={14} padding={24}>
          <Text testID="create-pod-load-failed" role="alert" textAlign="center" color="$danger">
            {t('mweb.createPod.autosave.loadFailed')}
          </Text>
          <PrimaryButton
            testID="create-pod-load-retry"
            label={t('mweb.createPod.autosave.retry')}
            onPress={retry}
          />
        </YStack>
      ) : null}
      {ready && !isHost ? (
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
      {ready && isHost && hostAgain === 'failed' ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
          <Text
            testID="create-pod-host-again-failed"
            role="alert"
            textAlign="center"
            color="$danger"
          >
            {t('mweb.hostPodActions.hostAgainFailed')}
          </Text>
        </YStack>
      ) : null}
      {ready && isHost && hostAgain !== 'failed' ? (
        <RefreshScrollView showsVerticalScrollIndicator={false}>
          <Reveal>
            {copied ? (
              <YStack paddingHorizontal={16} paddingTop={12}>
                <HostAgainNotice
                  sourceTitle={copied.source_title}
                  notices={copied.notices}
                  otherCityName={otherCity ? clubCityName(otherCity) : null}
                />
              </YStack>
            ) : null}
            <CreatePodStepper
              initialValues={initialValues}
              initialStep={initialStep}
              initialDraftId={initialDraftId}
              clubs={clubs}
              locations={locations}
              venues={venues}
              products={products}
              subCategories={subCategories}
              categoryIcons={categoryIcons}
              hostCategories={hostCategories}
              viewerUserId={viewerUserId}
              pinnedVenueId={pinnedVenueId}
              pickedVenueId={pickedVenueId}
              finance={finance}
              onSaveDraft={saveDraft}
              onAutosave={setAutosave}
              onModerate={moderate}
              onPublish={async (id, input) => {
                const created = await publish(id, input);
                fireAndForget(useHomeStore.getState().fetch(true));
                // Venue bookings are instant, so a new pod comes back APPROVED
                // and lands where a live pod lands. PENDING is kept only for
                // older pods still waiting on a venue (mWeb twin).
                if (created.venue_approval_status === PodVenueApproval.Pending) {
                  navigation.replace('PodPending', { podId: created.id });
                } else if (await challengeRequired(created.id)) {
                  // The pod's category requires a challenge: take the host to set it up.
                  navigation.replace('HostPodChallenges', { podId: created.id });
                } else {
                  navigation.replace('HostManage');
                }
              }}
            />
          </Reveal>
        </RefreshScrollView>
      ) : null}
      <ConfirmDialog
        open={leaveGuard.prompt}
        testID="create-pod-leave"
        title={t('mweb.createPod.autosave.leaveTitle')}
        message={t('mweb.createPod.autosave.leaveMessage')}
        confirmLabel={t('mweb.createPod.autosave.leave')}
        cancelLabel={t('mweb.createPod.autosave.stay')}
        destructive
        onConfirm={leaveGuard.leave}
        onCancel={leaveGuard.stay}
      />
    </StackScreen>
  );
}
