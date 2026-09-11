import { useState } from 'react';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { LocationDialog } from '@/components/LocationDialog';
import { useLocations } from '@/hooks/useLocations';
import { useThemeColors } from '@/hooks/useThemeColors';
import { countryFlagUrl } from '@/utils/location-tree';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Header chip showing the selected country flag + city; opens the picker. */
export function LocationButton() {
  const { t } = useTranslation();
  const { cityLabel, countryCode } = useLocations();
  const { accent } = useThemeColors();
  const [open, setOpen] = useState(false);
  const flag = countryFlagUrl(countryCode);

  return (
    <>
      <XStack
        testID="location-button"
        role="button"
        aria-label={t('mweb.common.selectLocation')}
        onPress={() => setOpen(true)}
        alignItems="center"
        gap={6}
        maxWidth={160}
        height={40}
        paddingHorizontal={12}
        borderRadius={999}
        borderWidth={1}
        borderColor="$cardBorder"
        backgroundColor="$surface"
        pressStyle={PRESS_STYLE.surface}
      >
        {flag ? (
          <AppImage source={{ uri: flag }} style={{ width: 18, height: 13, borderRadius: 3 }} />
        ) : (
          <MaterialIcons name="place" size={18} color={accent} />
        )}
        <Text flexShrink={1} fontSize={13} fontWeight="600" color="$color" numberOfLines={1}>
          {cityLabel || 'Location'}
        </Text>
      </XStack>
      <LocationDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
