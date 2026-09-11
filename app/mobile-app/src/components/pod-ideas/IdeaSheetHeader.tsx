import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  title: string;
  /** testID of the round close button. */
  closeTestID: string;
  onClose: () => void;
}

/** The pod-idea sheets' header: a 17/600 title and a round 40px soft close
 * button — shared by the composer and the details sheet. */
export function IdeaSheetHeader({ title, closeTestID, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  return (
    <XStack alignItems="center" justifyContent="space-between" gap={12} padding={16}>
      <Text flex={1} fontSize={17} fontWeight="600" color="$color" numberOfLines={1}>
        {title}
      </Text>
      <XStack
        pressStyle={PRESS_STYLE.surface}
        testID={closeTestID}
        role="button"
        aria-label={t('mweb.common.close')}
        onPress={onClose}
        width={40}
        height={40}
        borderRadius={20}
        backgroundColor="$soft"
        alignItems="center"
        justifyContent="center"
      >
        <MaterialIcons name="close" size={20} color={color} />
      </XStack>
    </XStack>
  );
}
