import { Spinner, Text, XStack, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface KeepSpotDialogProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Backout attempts the user still has for this pod (max − used). */
  attemptsLeft: number;
  /** Server error (e.g. replacement already confirmed) shown inside the sheet. */
  error?: string | null;
}

/** "Change of plans?" sheet — cancel an in-process backout and restore the
 * booking. RN twin of mWeb's KeepSpotDialog.
 *
 * On {@link DuncitDialog} because the body is a localized paragraph: the sheet
 * had an `86%` cap but no scroller, so a longer translation was silently
 * clipped with no way to read the rest. The dialog also refuses to dismiss
 * while the restore is in flight. */
export function KeepSpotDialog({
  open,
  busy,
  onClose,
  onConfirm,
  attemptsLeft,
  error = null,
}: Readonly<KeepSpotDialogProps>) {
  const { onPrimary } = useThemeColors();
  const { t } = useTranslation();

  const footer = (
    <XStack gap={12}>
      <XStack
        testID="keep-spot-cancel"
        role="button"
        aria-label={t('mweb.podDetails.close')}
        aria-disabled={busy}
        onPress={busy ? undefined : onClose}
        flex={1}
        height={48}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        opacity={busy ? 0.6 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="600" color="$color">
          {t('mweb.podDetails.close')}
        </Text>
      </XStack>
      <XStack
        testID="keep-spot-confirm"
        role="button"
        aria-label={t('mweb.podDetails.keepMySpot')}
        aria-disabled={busy}
        onPress={busy ? undefined : onConfirm}
        flex={2}
        height={48}
        alignItems="center"
        justifyContent="center"
        gap={8}
        borderRadius={12}
        backgroundColor="$primary"
        opacity={busy ? 0.7 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        {busy ? <Spinner size="small" color={onPrimary} /> : null}
        <Text fontSize={14} fontWeight="700" color={onPrimary}>
          {busy ? t('mweb.podDetails.restoring') : t('mweb.podDetails.keepMySpot')}
        </Text>
      </XStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="keep-spot-dialog"
      title={t('mweb.podDetails.changeOfPlans')}
      closeLabel={t('mweb.podDetails.close')}
      // Restoring the booking is a write in flight — dismissing mid-request
      // would leave the caller showing a stale state.
      dismissOnBackdrop={!busy}
      showCloseButton={!busy}
      footer={footer}
    >
      <YStack gap={10}>
        <Text fontSize={14} lineHeight={22} color="$color">
          {t('mweb.podDetails.keepSpotBody', { vars: { count: attemptsLeft } })}
        </Text>
        {error ? (
          <Text testID="keep-spot-error" fontSize={13} fontWeight="600" color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
