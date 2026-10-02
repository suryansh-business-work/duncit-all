import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { IconDisc } from '@/components/account/IconDisc';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  onPress: () => void;
}

/**
 * Profile Settings → Privacy & data: one row, the door to the screen where
 * tracking choices and the data download live. Tamagui twin of mWeb's
 * PrivacyDataEntryCard (rule 27).
 */
export function PrivacyDataEntryCard({ onPress }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const title = t('privacy.page.title');
  const hint = t('privacy.page.entryHint');

  return (
    <SurfaceCard
      testID="privacy-entry"
      role="button"
      aria-label={title}
      accessibilityHint={hint}
      tabIndex={0}
      onPress={onPress}
      flexDirection="row"
      alignItems="center"
      gap={16}
      paddingVertical={14}
      pressStyle={PRESS_STYLE.surface}
    >
      <IconDisc icon="privacy-tip" />
      <YStack flex={1}>
        <Text fontSize={15} fontWeight="500" color="$color">
          {title}
        </Text>
        <Text fontSize={14} color="$muted">
          {hint}
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </SurfaceCard>
  );
}
