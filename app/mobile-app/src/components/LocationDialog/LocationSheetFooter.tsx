import { Text, XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  applyLabel: string;
  canApply: boolean;
  onCancel: () => void;
  onApply: () => void;
}

/** The sheet's two pills: an outlined Cancel and the green Apply, twice as
 * wide. mWeb twin: the `actions` of app-header/LocationDialog. */
export function LocationSheetFooter({ applyLabel, canApply, onCancel, onApply }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <XStack paddingHorizontal={16} paddingVertical={12} gap={12}>
      <XStack
        testID="location-cancel"
        role="button"
        aria-label={t('mweb.common.cancel')}
        onPress={onCancel}
        flex={1}
        height={52}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={15} fontWeight="600" color="$color">
          Cancel
        </Text>
      </XStack>
      <XStack
        testID="location-apply"
        role="button"
        aria-label={t('mweb.location.applyLocation')}
        aria-disabled={!canApply}
        onPress={onApply}
        flex={2}
        height={52}
        paddingHorizontal={16}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        backgroundColor={canApply ? '$primary' : '$soft'}
        opacity={canApply ? 1 : 0.6}
        pressStyle={PRESS_STYLE.solid}
      >
        <Text
          fontSize={15}
          fontWeight="600"
          color={canApply ? '$onPrimary' : '$muted'}
          numberOfLines={1}
        >
          {applyLabel}
        </Text>
      </XStack>
    </XStack>
  );
}
