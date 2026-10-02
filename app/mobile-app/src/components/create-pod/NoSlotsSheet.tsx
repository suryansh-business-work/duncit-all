import { Text, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useClubSlotRequest } from '@/hooks/useClubSlotRequest';
import { useTranslation } from '@/hooks/useTranslation';
import type { CreatePodClub } from './create-pod.types';

interface Props {
  /** The club the host tried to pick; null keeps the dialog closed. */
  club: CreatePodClub | null;
  onClose: () => void;
}

/**
 * Shown instead of selecting a club whose venues have no open slot: a physical
 * pod cannot be planned there, so the host picks another club — or messages
 * the club admin (WhatsApp + email) to get the venues to open slots.
 * mWeb twin: steps/NoSlotsDialog (rule 27).
 */
export function NoSlotsSheet({ club, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { ask, loading, notice } = useClubSlotRequest(club?.id ?? '');

  const footer = (
    <YStack gap={8}>
      <DuncitButton
        testID="create-pod-no-slots-choose"
        label={t('mweb.createPod.noSlotsChooseAnother')}
        onPress={onClose}
        variant="solid"
        size="lg"
        fullWidth
      />
      <DuncitButton
        testID="create-pod-no-slots-notify"
        label={t('mweb.createPod.noSlotsNotifyAdmin')}
        onPress={ask}
        loading={loading}
        disabled={notice?.done === true}
        variant="outline"
        tone="neutral"
        size="lg"
        fullWidth
      />
    </YStack>
  );

  return (
    <DuncitDialog
      open={club !== null}
      onClose={onClose}
      testID="create-pod-no-slots-dialog"
      variant="center"
      title={t('mweb.createPod.noSlotsTitle')}
      closeLabel={t('mweb.auth.close')}
      showCloseButton={false}
      footer={footer}
    >
      <YStack gap={10}>
        <Text fontSize={14} color="$warning" fontWeight="600">
          {t('mweb.createPod.noSlotsBody', { vars: { club: club?.club_name ?? '' } })}
        </Text>
        <Text fontSize={13} color="$muted">
          {t('mweb.createPod.noSlotsAskHint')}
        </Text>
        {notice ? (
          <Text
            testID="create-pod-no-slots-notice"
            role="status"
            fontSize={13}
            fontWeight="600"
            color={notice.color}
          >
            {t(notice.key)}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
