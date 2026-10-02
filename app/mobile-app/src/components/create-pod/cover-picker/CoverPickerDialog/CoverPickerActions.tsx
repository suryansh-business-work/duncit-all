import { Text, XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface CoverPickerActionsProps {
  trayCount: number;
  doneLabel: string;
  onPrimary: string;
  onClose: () => void;
  onDone: () => void;
}

/** Cancel / "Use this image" — the row that must never give way. */
export function CoverPickerActions({
  trayCount,
  doneLabel,
  onPrimary,
  onClose,
  onDone,
}: Readonly<CoverPickerActionsProps>) {
  const { t } = useTranslation();
  return (
    <XStack gap={12} paddingTop={8} flexShrink={0}>
      <XStack
        testID="cover-picker-cancel"
        tabIndex={0}
        role="button"
        aria-label={t('mweb.createPod.cancel')}
        onPress={onClose}
        flex={1}
        height={52}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        backgroundColor="$soft"
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={15} fontWeight="600" color="$color">
          {t('mweb.createPod.cancel')}
        </Text>
      </XStack>
      <XStack
        testID="cover-picker-done"
        tabIndex={0}
        role="button"
        aria-label={t('mweb.createPod.useSelectedImages')}
        aria-disabled={trayCount === 0}
        onPress={trayCount === 0 ? undefined : onDone}
        flex={2}
        height={52}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        backgroundColor="$primary"
        opacity={trayCount === 0 ? 0.6 : 1}
        pressStyle={PRESS_STYLE.solid}
      >
        <Text fontSize={15} fontWeight="600" color={onPrimary}>
          {doneLabel}
        </Text>
      </XStack>
    </XStack>
  );
}
