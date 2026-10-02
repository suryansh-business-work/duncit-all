import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** "Comments" heading and the sheet's close button. */
export function CommentsSheetHeader({
  color,
  onClose,
}: Readonly<{ color: string; onClose: () => void }>) {
  const { t } = useTranslation();
  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      paddingHorizontal={16}
      paddingTop={16}
      paddingBottom={8}
    >
      <Text role="heading" fontSize={17} fontWeight="600" color="$color">
        {t('mweb.podDetails.comments')}
      </Text>
      <XStack
        pressStyle={PRESS_STYLE.surface}
        testID="pod-comments-close"
        role="button"
        tabIndex={0}
        aria-label={t('mweb.podDetails.close')}
        hitSlop={4}
        onPress={onClose}
        width={36}
        height={36}
        borderRadius={18}
        backgroundColor="$soft"
        alignItems="center"
        justifyContent="center"
      >
        <MaterialIcons name="close" size={20} color={color} />
      </XStack>
    </XStack>
  );
}
