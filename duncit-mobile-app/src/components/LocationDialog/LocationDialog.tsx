import { useState } from 'react';
import { Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useLocations } from '@/hooks/useLocations';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { LocationItem } from '@/stores/location.store';

/** Bottom-sheet location picker — a "use my location" GPS button + the list of
 * active cities. RN port of mWeb's GpsLocationPicker + city selector. */
export function LocationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locations, select, selectedId } = useLocations();
  const { color, primary } = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [detected, setDetected] = useState('');
  const [error, setError] = useState('');

  const matchCity = (city: string) =>
    locations.find(
      (l) =>
        l.city.toLowerCase() === city.toLowerCase() ||
        l.location_name.toLowerCase() === city.toLowerCase(),
    );

  const detect = async () => {
    setError('');
    setBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Location permission is needed to detect your city.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const city = geo?.city ?? geo?.subregion ?? '';
      setDetected(city);
      const match = matchCity(city);
      if (match) {
        select(match);
        onClose();
      } else {
        setError(`Duncit isn't in ${city || 'your area'} yet. Pick a city below.`);
      }
    } catch {
      setError('Could not detect your location.');
    } finally {
      setBusy(false);
    }
  };

  const pick = (loc: LocationItem) => {
    select(loc);
    onClose();
  };

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
            maxHeight="82%"
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
          >
            <SafeAreaView edges={['bottom']}>
              <YStack padding={16} gap={12}>
                <XStack alignItems="center" justifyContent="space-between">
                  <Text fontSize={18} fontWeight="900" color="$color">
                    Choose location
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
                  onPress={() => void detect()}
                  alignItems="center"
                  justifyContent="center"
                  gap={8}
                  height={46}
                  borderRadius={12}
                  borderWidth={1.5}
                  borderColor="$primary"
                  pressStyle={{ opacity: 0.85 }}
                >
                  {busy ? (
                    <Spinner color="$primary" />
                  ) : (
                    <MaterialIcons name="my-location" size={18} color={primary} />
                  )}
                  <Text fontSize={14} fontWeight="900" color="$primary">
                    {busy ? 'Locating…' : 'Use my location'}
                  </Text>
                </XStack>
                {detected ? (
                  <Text fontSize={12} color="$muted">
                    Detected: {detected}
                  </Text>
                ) : null}
                {error ? (
                  <Text testID="location-error" fontSize={12} color="$danger">
                    {error}
                  </Text>
                ) : null}
                <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                  <YStack gap={8}>
                    {locations.map((loc) => (
                      <XStack
                        key={loc.id}
                        testID={`location-${loc.id}`}
                        role="button"
                        aria-label={loc.location_name}
                        aria-selected={selectedId === loc.id}
                        onPress={() => pick(loc)}
                        alignItems="center"
                        gap={12}
                        padding={10}
                        borderRadius={14}
                        borderWidth={1}
                        borderColor={selectedId === loc.id ? '$primary' : '$borderColor'}
                        backgroundColor="$surface"
                        pressStyle={{ opacity: 0.85 }}
                      >
                        {loc.location_image ? (
                          <Image
                            source={{ uri: loc.location_image }}
                            style={{ width: 44, height: 44, borderRadius: 10 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <MaterialIcons name="location-city" size={28} color={primary} />
                        )}
                        <YStack flex={1}>
                          <Text fontSize={14.5} fontWeight="800" color="$color" numberOfLines={1}>
                            {loc.location_name}
                          </Text>
                          <Text fontSize={12} color="$muted" numberOfLines={1}>
                            {[loc.city, loc.state].filter(Boolean).join(', ')}
                          </Text>
                        </YStack>
                        {selectedId === loc.id ? (
                          <MaterialIcons name="check-circle" size={20} color={primary} />
                        ) : null}
                      </XStack>
                    ))}
                  </YStack>
                </ScrollView>
              </YStack>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
