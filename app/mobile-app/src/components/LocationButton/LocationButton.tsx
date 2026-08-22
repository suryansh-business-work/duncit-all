import { useState } from 'react';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { LocationDialog } from '@/components/LocationDialog';
import { useLocations } from '@/hooks/useLocations';
import { useThemeColors } from '@/hooks/useThemeColors';
import { countryFlagUrl } from '@/utils/location-tree';
import { useTranslation } from '@/hooks/useTranslation';

/** Header chip showing the selected country flag + city; opens the picker. */
export function LocationButton() {
  const { t } = useTranslation();
  const { cityLabel, countryCode } = useLocations();
  const { color } = useThemeColors();
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
        gap={4}
        maxWidth={132}
        height={36}
        paddingHorizontal={10}
        borderRadius={10}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        pressStyle={{ opacity: 0.7 }}
      >
        {flag ? (
          <AppImage source={{ uri: flag }} style={{ width: 18, height: 13, borderRadius: 2 }} />
        ) : (
          <MaterialIcons name="place" size={15} color={color} />
        )}
        <Text fontSize={12} fontWeight="600" color="$color" numberOfLines={1}>
          {cityLabel || 'Location'}
        </Text>
      </XStack>
      <LocationDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
