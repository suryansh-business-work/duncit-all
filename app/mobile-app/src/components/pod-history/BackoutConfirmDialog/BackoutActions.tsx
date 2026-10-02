import { Spinner, Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface BackoutActionsProps {
  busy: boolean;
  /** Seats the confirm button releases. */
  releasing: number;
  onClose: () => void;
  onConfirm: (seats: number) => void;
}

/** Close + Confirm row of the sheet; both buttons go inert while busy. */
export function BackoutActions({
  busy,
  releasing,
  onClose,
  onConfirm,
}: Readonly<BackoutActionsProps>) {
  const { onPrimary } = useThemeColors();
  const { t } = useTranslation();
  return (
    <XStack padding={16} gap={12}>
      <XStack
        testID="backout-cancel"
        role="button"
        tabIndex={0}
        aria-label={t('mweb.podDetails.close')}
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
          {t('mweb.podDetails.close')}
        </Text>
      </XStack>
      <XStack
        testID="backout-confirm"
        role="button"
        tabIndex={0}
        aria-label={t('mweb.podDetails.confirmBackout')}
        aria-disabled={busy}
        onPress={busy ? undefined : () => onConfirm(releasing)}
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
          {busy ? t('mweb.podDetails.backingOut') : t('mweb.podDetails.confirmBackout')}
        </Text>
      </XStack>
    </XStack>
  );
}
