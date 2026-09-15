import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { DuncitDialog } from '@/components/DuncitDialog';
import { usePodStatusUpload } from '@/hooks/usePodStatusUpload';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  podId: string;
  /** Re-reads the pod so the new status shows in its gallery. */
  onAdded: () => Promise<void>;
}

/**
 * The host's "Add status" affordance on their own pod: the button, a note that
 * nobody else sees it, and an info button that explains what a status does.
 * The parent renders it only for the pod's hosts. RN twin of mWeb's
 * pod-details-page/HostStatusAction.
 */
export function PodHostStatus({ podId, onAdded }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color, muted } = useThemeColors();
  const { uploading, error, pickAndAdd } = usePodStatusUpload(podId, onAdded);
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <YStack testID="pod-host-status" alignItems="flex-end" gap={4} flexShrink={0}>
      <XStack
        testID="pod-overview-add-status"
        role="button"
        tabIndex={0}
        aria-label={t('mweb.podDetails.addStatus')}
        aria-busy={uploading}
        disabled={uploading}
        onPress={pickAndAdd}
        pressStyle={PRESS_STYLE.surface}
        alignItems="center"
        gap={6}
        minHeight={36}
        borderRadius={999}
        paddingHorizontal={12}
        backgroundColor="$surface"
      >
        {uploading ? (
          <Spinner size="small" color={color} />
        ) : (
          <MaterialIcons name="add-photo-alternate" size={18} color={color} />
        )}
        <Text fontSize={13} fontWeight="600" color="$color">
          {uploading ? t('mweb.podDetails.addStatusUploading') : t('mweb.podDetails.addStatus')}
        </Text>
      </XStack>
      <XStack alignItems="center" gap={4}>
        <MaterialIcons
          testID="pod-host-status-visibility-icon"
          name="visibility"
          size={14}
          color={muted}
        />
        <Text testID="pod-host-status-only-you" fontSize={12} color="$muted">
          {t('mweb.podDetails.addStatusOnlyYou')}
        </Text>
        <XStack
          testID="pod-host-status-info"
          role="button"
          tabIndex={0}
          aria-label={t('mweb.podDetails.addStatusInfoLabel')}
          onPress={() => setInfoOpen(true)}
          pressStyle={PRESS_STYLE.inline}
          hitSlop={8}
        >
          <MaterialIcons name="info-outline" size={16} color={muted} />
        </XStack>
      </XStack>
      {error ? (
        <Text testID="pod-host-status-error" role="alert" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
      <DuncitDialog
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        testID="pod-host-status-info-dialog"
        variant="center"
        title={t('mweb.podDetails.addStatusOnlyYou')}
        closeLabel={t('mweb.podDetails.close')}
      >
        <Text testID="pod-host-status-info-body" fontSize={14} color="$muted" lineHeight={20}>
          {t('mweb.podDetails.addStatusInfoBody')}
        </Text>
      </DuncitDialog>
    </YStack>
  );
}
