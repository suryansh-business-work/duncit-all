import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { venueLabel, type SwitchableVenue } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  venue: SwitchableVenue;
  selected: boolean;
  onOpen: () => void;
  onEdit: () => void;
}

/**
 * One of the owner's venues on Your Venues: name, city and a status chip. The
 * body opens the venue (selecting it for every venue screen); Edit is its own
 * control beside it, so the two never nest. The selected venue is ticked.
 */
export function VenueListRow({ venue, selected, onOpen, onEdit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const name = venueLabel(venue, t('mweb.venueManagePage.untitledVenue'));

  return (
    <XStack alignItems="center" gap={8} paddingHorizontal={16} paddingVertical={10}>
      <XStack
        testID={`venue-list-row-${venue.id}`}
        role="button"
        aria-label={name}
        aria-selected={selected}
        accessibilityHint={[venue.city, venue.status].filter(Boolean).join(', ')}
        tabIndex={0}
        onPress={onOpen}
        pressStyle={PRESS_STYLE.row}
        flex={1}
        minWidth={0}
        alignItems="center"
        gap={10}
        minHeight={48}
      >
        <YStack flex={1} minWidth={0} gap={4}>
          <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
            {name}
          </Text>
          <XStack alignItems="center" gap={8}>
            {venue.city ? (
              <Text fontSize={12} color="$muted" numberOfLines={1} flexShrink={1}>
                {venue.city}
              </Text>
            ) : null}
            {venue.status ? (
              <Text
                testID={`venue-list-status-${venue.id}`}
                fontSize={11}
                fontWeight="600"
                color={venue.status === 'APPROVED' ? '$success' : '$muted'}
                backgroundColor="$soft"
                borderRadius={999}
                paddingHorizontal={8}
                paddingVertical={2}
                overflow="hidden"
              >
                {venue.status}
              </Text>
            ) : null}
          </XStack>
        </YStack>
        {selected ? <MaterialIcons name="check-circle" size={20} color={primary} /> : null}
      </XStack>
      <DuncitButton
        testID={`venue-list-edit-${venue.id}`}
        label={t('mweb.studioOptions.editVenue')}
        variant="outline"
        size="sm"
        onPress={onEdit}
      />
    </XStack>
  );
}
