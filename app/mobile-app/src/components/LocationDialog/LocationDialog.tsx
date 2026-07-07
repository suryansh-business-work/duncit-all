import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';

import { AreaList } from './AreaList';
import { CityList } from './CityList';
import { CountryStateChips } from './CountryStateChips';
import { LocationMap } from './LocationMap';
import { useLocationDraft } from './useLocationDraft';
import type { LocationItem } from '@/stores/location.store';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Capture the pick into the caller (create-pod) instead of the global header. */
  onApply?: (location: LocationItem, zone: string) => void;
  /** Seed the drilldown from this location instead of the global selection. */
  initialLocationId?: string;
}

/** Bottom-sheet location picker: GPS + country → state → city → area drilldown
 * with an interactive map. RN port of mWeb's LocationDialog (apply-on-confirm).
 * Defaults to setting the global header location; pass `onApply` to capture the
 * pick into a form (create-pod). */
export function LocationDialog({ open, onClose, onApply, initialLocationId }: Readonly<Props>) {
  const draft = useLocationDraft(open, onClose, { onApply, initialId: initialLocationId });
  const { color, primary, onPrimary } = useThemeColors();
  const zonesLabel = draft.zones.length ? `Apply · ${draft.zones.length} areas` : 'Apply';
  const applyLabel = draft.draftZone ? `Apply · ${draft.draftZone}` : zonesLabel;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} testID="location-dialog">
          <YStack
            testID="location-backdrop"
            role="button"
            aria-label="Close"
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            position="absolute"
            left={0}
            right={0}
            bottom={0}
            maxHeight="88%"
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
          >
            <SafeAreaView edges={['bottom']}>
              <YStack paddingHorizontal={16} paddingTop={16} gap={12}>
                <XStack alignItems="center" justifyContent="space-between">
                  <Text fontSize={18} fontWeight="900" color="$color">
                    Choose your location
                  </Text>
                  <XStack
                    testID="location-close"
                    role="button"
                    aria-label="Close"
                    onPress={onClose}
                    width={32}
                    height={32}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <MaterialIcons name="close" size={20} color={color} />
                  </XStack>
                </XStack>
                <XStack
                  testID="location-gps"
                  role="button"
                  aria-label="Use my location"
                  onPress={() => void draft.detect()}
                  alignItems="center"
                  justifyContent="center"
                  gap={8}
                  height={46}
                  borderRadius={12}
                  borderWidth={1.5}
                  borderColor="$primary"
                  pressStyle={{ opacity: 0.85 }}
                >
                  {draft.busy ? (
                    <Spinner color="$primary" />
                  ) : (
                    <MaterialIcons name="my-location" size={18} color={primary} />
                  )}
                  <Text fontSize={14} fontWeight="900" color="$primary">
                    {draft.busy ? 'Locating…' : 'Use my location'}
                  </Text>
                </XStack>
                {draft.detected ? (
                  <Text fontSize={12} color="$muted">
                    Detected: {draft.detected}
                  </Text>
                ) : null}
                {draft.error ? (
                  <Text testID="location-error" fontSize={12} color="$danger">
                    {draft.error}
                  </Text>
                ) : null}
              </YStack>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                <YStack paddingHorizontal={16} paddingVertical={12} gap={16}>
                  <CountryStateChips
                    tree={draft.tree}
                    country={draft.country}
                    state={draft.state}
                    onCountry={draft.pickCountry}
                    onState={draft.setState}
                  />
                  <CityList cities={draft.cities} draftId={draft.draftId} onPick={draft.pickCity} />
                  {draft.draftLoc ? (
                    <AreaList
                      locationName={draft.draftLoc.location_name}
                      zones={draft.zones}
                      draftZone={draft.draftZone}
                      onZone={draft.setDraftZone}
                    />
                  ) : null}
                  <LocationMap
                    city={draft.draftLoc?.city || draft.draftLoc?.location_name}
                    zoneName={draft.draftZone}
                    pincode={draft.draftLoc?.location_pincode}
                    country={draft.draftLoc?.country}
                  />
                </YStack>
              </ScrollView>

              <XStack paddingHorizontal={16} paddingVertical={12} gap={12}>
                <XStack
                  testID="location-cancel"
                  role="button"
                  aria-label="Cancel"
                  onPress={onClose}
                  flex={1}
                  height={48}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={12}
                  borderWidth={1}
                  borderColor="$borderColor"
                  pressStyle={{ opacity: 0.85 }}
                >
                  <Text fontSize={14} fontWeight="800" color="$color">
                    Cancel
                  </Text>
                </XStack>
                <XStack
                  testID="location-apply"
                  role="button"
                  aria-label="Apply location"
                  aria-disabled={!draft.draftId}
                  onPress={draft.apply}
                  flex={2}
                  height={48}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={12}
                  backgroundColor={draft.draftId ? '$primary' : '$borderColor'}
                  opacity={draft.draftId ? 1 : 0.6}
                  pressStyle={{ opacity: 0.85 }}
                >
                  <Text fontSize={14} fontWeight="900" color={draft.draftId ? onPrimary : color}>
                    {applyLabel}
                  </Text>
                </XStack>
              </XStack>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
