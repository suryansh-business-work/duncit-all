import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** The quiet "Contact support" link at the foot of a pod's details. */
export function PodContactSupportLink({ onPress }: Readonly<{ onPress: () => void }>) {
  const { primary } = useThemeColors();
  const { t } = useTranslation();
  return (
    <XStack
      pressStyle={PRESS_STYLE.surface}
      testID="pod-contact-support"
      role="button"
      aria-label={t('mweb.podDetails.contactSupport')}
      onPress={onPress}
      alignItems="center"
      alignSelf="flex-start"
      gap={6}
      paddingHorizontal={16}
      paddingVertical={12}
    >
      <MaterialIcons name="contact-support" size={18} color={primary} />
      <Text fontSize={13} fontWeight="600" color="$primary">
        {t('mweb.podDetails.contactSupport')}
      </Text>
    </XStack>
  );
}
