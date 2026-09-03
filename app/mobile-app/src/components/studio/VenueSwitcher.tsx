import { useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { canSwitchVenues, venueLabel, venueSubLabel, type SwitchableVenue } from '@duncit/utils';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface VenueOptionProps {
  venue: SwitchableVenue;
  label: string;
  selected: boolean;
  tick: string;
  onPress: (venueId: string) => void;
}

/** One venue in the open dropdown. */
function VenueOption({ venue, label, selected, tick, onPress }: Readonly<VenueOptionProps>) {
  return (
    <XStack
      testID={`venue-switcher-option-${venue.id}`}
      role="button"
      aria-label={label}
      onPress={() => onPress(venue.id)}
      pressStyle={PRESS_STYLE.surface}
      alignItems="center"
      gap={10}
      paddingHorizontal={14}
      paddingVertical={12}
      borderRadius={12}
      backgroundColor={selected ? '$surface' : 'transparent'}
    >
      <YStack flex={1}>
        <Text fontSize={14.5} fontWeight="700" color="$color" numberOfLines={1}>
          {label}
        </Text>
        <Text fontSize={11.5} color="$muted" numberOfLines={1}>
          {venueSubLabel(venue)}
        </Text>
      </YStack>
      {selected ? <MaterialIcons name="check" size={20} color={tick} /> : null}
    </XStack>
  );
}

interface VenueSwitcherProps {
  venues: readonly SwitchableVenue[];
  venueId: string | null;
  onSelect: (venueId: string) => void;
}

/**
 * "Switch your venue" — the Tamagui twin of mWeb's dropdown (rule 27).
 *
 * Everything below it on the Venue Studio screen belongs to the venue picked
 * here. Hidden for a single venue: there is nothing to switch to, and an empty
 * dropdown reads as a missing venue.
 */
export function VenueSwitcher({ venues, venueId, onSelect }: Readonly<VenueSwitcherProps>) {
  const { t } = useTranslation();
  const { color, primary } = useThemeColors();
  const [open, setOpen] = useState(false);

  const untitled = t('mweb.venueManagePage.untitledVenue');
  const heading = t('mweb.venueManagePage.switchYourVenue');
  const current = venues.find((venue) => venue.id === venueId) ?? null;

  if (!canSwitchVenues(venues)) return null;

  const choose = (id: string) => {
    setOpen(false);
    onSelect(id);
  };

  return (
    <YStack>
      <XStack
        testID="venue-switcher"
        role="button"
        aria-label={heading}
        onPress={() => setOpen(true)}
        pressStyle={PRESS_STYLE.surface}
        alignItems="center"
        gap={10}
        padding={12}
        borderRadius={14}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <MaterialIcons name="store" size={20} color={primary} />
        <YStack flex={1}>
          <Text fontSize={11} fontWeight="700" color="$primary">
            {heading}
          </Text>
          <Text fontSize={14.5} fontWeight="700" color="$color" numberOfLines={1}>
            {venueLabel(current, untitled)}
          </Text>
        </YStack>
        <MaterialIcons name="expand-more" size={22} color={color} />
      </XStack>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <ModalThemeScope>
          <YStack flex={1} alignItems="center" justifyContent="center">
            <YStack
              testID="venue-switcher-backdrop"
              role="button"
              aria-label={t('mweb.common.close')}
              onPress={() => setOpen(false)}
              pressStyle={PRESS_STYLE.surface}
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.5)"
            />
            <YStack
              testID="venue-switcher-sheet"
              width="86%"
              maxWidth={420}
              maxHeight="70%"
              backgroundColor="$background"
              borderRadius={20}
              padding={14}
              gap={6}
            >
              <SafeAreaView edges={[]}>
                <Text fontSize={15} fontWeight="700" color={color} paddingBottom={8}>
                  {heading}
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <YStack gap={2}>
                    {venues.map((venue) => (
                      <VenueOption
                        key={venue.id}
                        venue={venue}
                        label={venueLabel(venue, untitled)}
                        selected={venue.id === venueId}
                        tick={primary}
                        onPress={choose}
                      />
                    ))}
                  </YStack>
                </ScrollView>
              </SafeAreaView>
            </YStack>
          </YStack>
        </ModalThemeScope>
      </Modal>
    </YStack>
  );
}
