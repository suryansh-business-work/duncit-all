import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useLocations } from '@/hooks/useLocations';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  onOpen: () => void;
}

/** The tappable pin + city + chevron that opens the location picker. Every
 * studio mode renders it — a host, venue owner or club admin browses the same
 * city list a user does, so the switcher is never hidden behind a role. The
 * Tamagui twin of mWeb's HeaderLocationRow. */
export function HeaderLocationRow({ onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { cityLabel } = useLocations();
  const { primary } = useThemeColors();

  return (
    <XStack
      testID="header-location"
      role="button"
      aria-label={t('mweb.common.selectLocation')}
      onPress={onOpen}
      alignItems="center"
      gap={2}
      minWidth={0}
      pressStyle={PRESS_STYLE.row}
    >
      <MaterialIcons name="location-on" size={13} color={primary} />
      <Text fontSize={12} fontWeight="600" color="$primary" numberOfLines={1}>
        {cityLabel || 'Select city'}
      </Text>
      <MaterialIcons name="keyboard-arrow-down" size={16} color={primary} />
    </XStack>
  );
}
