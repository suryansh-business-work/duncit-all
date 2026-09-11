import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** The hairline "View club" pill the Club section shows when the pod carries no club card. */
export function ViewClubButton({ onOpenClub }: Readonly<{ onOpenClub: () => void }>) {
  const { color } = useThemeColors();
  const { t } = useTranslation();
  return (
    <XStack
      testID="pod-view-club"
      role="button"
      aria-label={t('mweb.podDetails.viewClub')}
      onPress={onOpenClub}
      alignItems="center"
      alignSelf="flex-start"
      gap={8}
      height={36}
      paddingHorizontal={14}
      borderRadius={999}
      borderWidth={1}
      borderColor="$borderColor"
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name="groups" size={18} color={color} />
      <Text fontSize={13} fontWeight="600" color="$color">
        {t('mweb.podDetails.viewClub')}
      </Text>
    </XStack>
  );
}
