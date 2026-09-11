import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { ScrollView, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';

import { AreaList } from './AreaList';
import { CityList } from './CityList';
import { CountryStateChips } from './CountryStateChips';
import { LocationMap } from './LocationMap';
import { LocationSheetFooter } from './LocationSheetFooter';
import { LocationSheetHeader } from './LocationSheetHeader';
import { useLocationDraft } from './useLocationDraft';
import type { LocationItem } from '@/stores/location.store';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
  const { t } = useTranslation();
  const draft = useLocationDraft(open, onClose, { onApply, initialId: initialLocationId });
  const zonesLabel = draft.zones.length ? `Apply · ${draft.zones.length} areas` : 'Apply';
  const applyLabel = draft.draftZone ? `Apply · ${draft.draftZone}` : zonesLabel;
  // `detect` settles every failure into `draft.error` itself; the catch only
  // keeps a press from ever leaving a floating promise.
  const detect = () => {
    draft.detect().catch(() => undefined);
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} testID="location-dialog">
            <YStack
              pressStyle={PRESS_STYLE.surface}
              testID="location-backdrop"
              role="button"
              aria-label={t('mweb.common.close')}
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
              borderTopLeftRadius={28}
              borderTopRightRadius={28}
              overflow="hidden"
            >
              <SafeAreaView edges={['bottom']} style={SHEET_SAFE_AREA}>
                <LocationSheetHeader
                  title="Choose your location"
                  onClose={onClose}
                  onDetect={detect}
                  busy={draft.busy}
                  detected={draft.detected}
                  error={draft.error}
                />

                <ScrollView style={SHEET_SAFE_AREA} showsVerticalScrollIndicator={false}>
                  <YStack paddingHorizontal={16} paddingVertical={16} gap={16}>
                    <CountryStateChips
                      tree={draft.tree}
                      country={draft.country}
                      state={draft.state}
                      onCountry={draft.pickCountry}
                      onState={draft.setState}
                    />
                    <CityList
                      cities={draft.cities}
                      draftId={draft.draftId}
                      onPick={draft.pickCity}
                    />
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

                <LocationSheetFooter
                  applyLabel={applyLabel}
                  canApply={!!draft.draftId}
                  onCancel={onClose}
                  onApply={draft.apply}
                />
              </SafeAreaView>
            </YStack>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
