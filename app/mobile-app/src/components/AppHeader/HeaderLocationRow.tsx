import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useLocations } from '@/hooks/useLocations';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  onOpen: () => void;
}

/** The location pill — coral pin + "City · Zone" + chevron — that opens the
 * location picker. Every studio mode renders it — a host, venue owner or club
 * admin browses the same city list a user does, so the switcher is never
 * hidden behind a role. The Tamagui twin of mWeb's HeaderLocationRow. */
export function HeaderLocationRow({ onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { cityLabel, zoneName } = useLocations();
  const { accent, muted } = useThemeColors();
  const city = cityLabel || 'Select city';
  const label = zoneName ? `${city} · ${zoneName}` : city;

  return (
    <XStack
      testID="header-location"
      role="button"
      aria-label={t('mweb.common.selectLocation')}
      onPress={onOpen}
      alignItems="center"
      gap={6}
      height={40}
      paddingHorizontal={12}
      minWidth={0}
      flexShrink={1}
      borderRadius={999}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$cardBorder"
      pressStyle={PRESS_STYLE.surface}
    >
      <MaterialIcons name="location-on" size={18} color={accent} />
      <Text flexShrink={1} fontSize={13} fontWeight="600" color="$color" numberOfLines={1}>
        {label}
      </Text>
      <MaterialIcons name="keyboard-arrow-down" size={18} color={muted} />
    </XStack>
  );
}
