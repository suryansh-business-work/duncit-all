import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { LocationDialog } from '@/components/LocationDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  cityLabel?: string;
}

/** The venue list's location row: which city the venues come from, and a Change
 * control that opens the SAME global location picker the header uses —
 * applying there moves the whole app, so the list follows.
 * mWeb twin: VenuesLocationBar. */
export function VenuesLocationBar({ cityLabel }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const [open, setOpen] = useState(false);
  const label = cityLabel
    ? t('mweb.venues.locationIn', { vars: { city: cityLabel } })
    : t('mweb.venues.locationAll');

  return (
    <>
      <XStack
        testID="venues-location-bar"
        role="button"
        aria-label={t('mweb.venues.changeAria')}
        onPress={() => setOpen(true)}
        alignItems="center"
        gap={6}
        paddingHorizontal={12}
        paddingVertical={10}
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        pressStyle={{ opacity: 0.85 }}
      >
        <MaterialIcons name="place" size={16} color={primary} />
        <Text flex={1} fontSize={12.5} fontWeight="700" color="$color" numberOfLines={1}>
          {label}
        </Text>
        <Text fontSize={12.5} fontWeight="700" color="$primary">
          {t('mweb.venues.change')}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={16} color={primary} />
      </XStack>
      <LocationDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
