import { Text, XStack, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ReasonField } from './ReasonField';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  reason: string;
  onChangeReason: (v: string) => void;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirm + required reason before cancelling an onboarding meeting.
 *
 * The reason field is why this one matters: it used to sit in a capless centred
 * card wrapped in `KeyboardScreen`, so on a short device the keyboard covered
 * the buttons under it. {@link DuncitDialog} lifts the card AND shrinks its
 * scroll area, and the two actions are pinned in the footer where the keyboard
 * cannot reach them.
 */
export function CancelDialog({
  open,
  reason,
  onChangeReason,
  busy,
  error,
  onClose,
  onConfirm,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();

  const footer = (
    <XStack gap={12}>
      <XStack
        testID="cancel-keep"
        role="button"
        aria-label={t('mweb.earn.keepMeeting')}
        onPress={onClose}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14} fontWeight="600" color="$color">
          Keep meeting
        </Text>
      </XStack>
      <XStack
        testID="cancel-confirm"
        role="button"
        aria-label={t('mweb.earn.cancelMeeting')}
        aria-disabled={busy}
        onPress={busy ? undefined : onConfirm}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        backgroundColor="$danger"
        opacity={busy ? 0.7 : 1}
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14} fontWeight="700" color={onPrimary}>
          {busy ? 'Cancelling…' : 'Cancel meeting'}
        </Text>
      </XStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="cancel-dialog"
      title={t('mweb.earn.cancelThisMeeting')}
      closeLabel="Close"
      variant="center"
      showCloseButton={false}
      footer={footer}
    >
      <YStack gap={10}>
        <Text fontSize={13.5} color="$muted">
          Your onboarding meeting will be cancelled and the slot freed. You can book a new one
          anytime.
        </Text>
        <ReasonField
          testID="cancel-reason"
          label={t('mweb.earn.whyAreYouCancelling')}
          value={reason}
          onChangeText={onChangeReason}
        />
        {error ? (
          <Text testID="cancel-error" fontSize={12.5} color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
