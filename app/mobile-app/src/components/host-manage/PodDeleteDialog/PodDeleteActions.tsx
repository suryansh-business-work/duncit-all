import { Spinner, Text, XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface PodDeleteActionsProps {
  busy: boolean;
  confirmLabel: string;
  onDismiss: (() => void) | undefined;
  onConfirm: () => void;
}

/** Keep pod / Cancel pod — both inert while the cancellation is in flight. */
export function PodDeleteActions({
  busy,
  confirmLabel,
  onDismiss,
  onConfirm,
}: Readonly<PodDeleteActionsProps>) {
  const { t } = useTranslation();
  return (
    <XStack gap={12} paddingTop={12}>
      <XStack
        testID="pod-delete-cancel"
        tabIndex={0}
        role="button"
        aria-label={t('mweb.hostManage.keepPod')}
        aria-disabled={busy}
        onPress={onDismiss}
        flex={1}
        height={48}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        opacity={busy ? 0.6 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="600" color="$color">
          Keep pod
        </Text>
      </XStack>
      <XStack
        testID="pod-delete-confirm"
        tabIndex={0}
        role="button"
        aria-label={confirmLabel}
        aria-disabled={busy}
        onPress={busy ? undefined : onConfirm}
        flex={1}
        height={48}
        alignItems="center"
        justifyContent="center"
        gap={8}
        borderRadius={999}
        backgroundColor="$danger"
        opacity={busy ? 0.7 : 1}
        pressStyle={PRESS_STYLE.solid}
      >
        {busy ? <Spinner size="small" color="$onDanger" /> : null}
        <Text fontSize={14} fontWeight="600" color="$onDanger" numberOfLines={1}>
          {busy ? 'Cancelling…' : confirmLabel}
        </Text>
      </XStack>
    </XStack>
  );
}
