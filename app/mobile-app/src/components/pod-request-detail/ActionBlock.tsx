import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, YStack } from 'tamagui';
import { podRequestNextAction } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RespondButtons } from '@/components/pod-requests/RespondButtons';
import type { PodRequestActions } from '@/hooks/usePodRequestActions';
import type { PodRequestDetail } from '@/hooks/usePodRequestDetail';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';
import { PickSlotBlock } from './PickSlotBlock';

interface Props {
  request: PodRequestDetail;
  actions: PodRequestActions;
}

function Waiting({ text }: Readonly<{ text: string }>) {
  return (
    <Text role="status" testID="pod-request-waiting" fontSize={14} color="$muted">
      {text}
    </Text>
  );
}

/**
 * What the viewer's side can do now (the shared `podRequestNextAction`):
 * answer it, withdraw it, pick the slot, answer the slot, create the pod — or
 * the line that says whose move it is. mWeb twin: ActionBlock.
 */
export function ActionBlock({ request, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  switch (podRequestNextAction(request)) {
    case 'RESPOND':
      return (
        <RespondButtons
          acceptLabel={t('podRequests.accept')}
          declineLabel={t('podRequests.decline')}
          busy={actions.busy}
          onAnswer={(accept) => fireAndForget(actions.respond(request.id, accept))}
          testID="pod-request-respond"
        />
      );
    case 'WITHDRAW':
      return (
        <YStack gap={12} alignItems="flex-start">
          <Waiting text={t('podRequests.waitingAnswer')} />
          <DuncitButton
            testID="pod-request-withdraw"
            label={t('podRequests.withdraw')}
            variant="outline"
            tone="danger"
            disabled={actions.busy}
            onPress={() => fireAndForget(actions.withdraw(request.id))}
          />
        </YStack>
      );
    case 'PICK_SLOT':
      return request.venue ? (
        <PickSlotBlock
          venueId={request.venue.id}
          busy={actions.busy}
          onSend={(slotId) => actions.requestSlot(request.id, slotId)}
        />
      ) : null;
    case 'WAIT_SLOT':
      return <Waiting text={t('podRequests.waitingSlot')} />;
    case 'CONFIRM_SLOT':
      return (
        <RespondButtons
          acceptLabel={t('podRequests.confirmSlot')}
          declineLabel={t('podRequests.declineSlot')}
          busy={actions.busy}
          onAnswer={(confirm) => fireAndForget(actions.respondSlot(request.id, confirm))}
          testID="pod-request-slot-answer"
        />
      );
    case 'WAIT_CONFIRM':
      return <Waiting text={t('podRequests.waitingConfirm')} />;
    case 'CREATE_POD':
      return (
        <YStack gap={12}>
          <Text fontSize={14} color="$color">
            {t('podRequests.createPodHint')}
          </Text>
          <PrimaryButton
            testID="pod-request-create-pod"
            label={t('podRequests.createPod')}
            onPress={() => navigation.navigate('CreatePod', { partnerRequestId: request.id })}
          />
        </YStack>
      );
    case 'HOST_CREATES':
      return <Waiting text={t('podRequests.hostCreatesPod')} />;
    default:
      return null;
  }
}
