import { Spinner, Text, XStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { freeSpotCancelHint, type FreeSpotCancels } from '@duncit/utils';

export interface CancelSpotDialogProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** The membership state's cancel counters — names how many cancels are left. */
  cancels?: FreeSpotCancels | null;
}

/** "Cancel your spot?" — the only way out of a FREE pod. No refund, so the
 * sheet says three things: the spot goes back on the pod, the member can join
 * again while it is open, and how many cancellations they have left (Pod
 * Settings caps them — freeSpotCancelHint). Used by Pod Details and Pod
 * History. RN twin of mWeb's CancelSpotDialog. */
export function CancelSpotDialog({
  open,
  busy,
  onClose,
  onConfirm,
  cancels,
}: Readonly<CancelSpotDialogProps>) {
  const { onPrimary } = useThemeColors();
  const { t } = useTranslation();
  const hint = freeSpotCancelHint(cancels);

  const footer = (
    <XStack gap={12}>
      <XStack
        testID="cancel-spot-keep"
        role="button"
        tabIndex={0}
        aria-label={t('mweb.podDetails.keepSpot')}
        aria-disabled={busy}
        onPress={busy ? undefined : onClose}
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
          {t('mweb.podDetails.keepSpot')}
        </Text>
      </XStack>
      <XStack
        testID="cancel-spot-confirm"
        role="button"
        tabIndex={0}
        aria-label={t('mweb.podDetails.cancelSpotConfirm')}
        aria-disabled={busy}
        onPress={busy ? undefined : onConfirm}
        flex={2}
        height={48}
        alignItems="center"
        justifyContent="center"
        gap={8}
        borderRadius={999}
        backgroundColor="$danger"
        opacity={busy ? 0.7 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        {busy ? <Spinner size="small" color={onPrimary} /> : null}
        <Text fontSize={14} fontWeight="700" color={onPrimary}>
          {busy ? t('mweb.podDetails.cancellingSpot') : t('mweb.podDetails.cancelSpotConfirm')}
        </Text>
      </XStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="cancel-spot-dialog"
      title={t('mweb.podDetails.cancelSpotTitle')}
      closeLabel={t('mweb.podDetails.close')}
      // A cancel in flight — dismissing mid-request would leave a stale bar.
      dismissOnBackdrop={!busy}
      showCloseButton={!busy}
      footer={footer}
    >
      <Text fontSize={14} lineHeight={22} color="$color">
        {t('mweb.podDetails.cancelSpotBody')}
      </Text>
      {hint ? (
        <Text
          testID="cancel-spot-limit-hint"
          fontSize={14}
          lineHeight={22}
          fontWeight="600"
          color="$color"
        >
          {t(hint.key, { vars: hint.vars })}
        </Text>
      ) : null}
    </DuncitDialog>
  );
}
