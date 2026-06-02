import { Text, View } from 'react-native';

import { LocationPanel } from '@/components/LocationPanel';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useLocation } from '@/hooks/useLocation';

export default function HomeScreen() {
  const {
    permission,
    coordinates,
    fetchLocation,
    submitLocation,
    isFetching,
    isSending,
    sendResponse,
    error,
    canSend,
  } = useLocation();

  return (
    <ScreenContainer testID="home-screen">
      <View className="gap-2">
        <Text className="text-3xl font-bold text-white">Duncit Location Demo</Text>
        <Text className="text-sm text-slate-400">
          Capture your current coordinates and send them to the Duncit API.
        </Text>
      </View>

      <LocationPanel
        permission={permission}
        coordinates={coordinates}
        isFetching={isFetching}
        sendResponse={sendResponse}
        error={error}
      />

      <View className="mt-auto gap-3">
        <PrimaryButton
          testID="get-location-button"
          label="Get Current Location"
          onPress={fetchLocation}
          loading={isFetching}
        />
        <PrimaryButton
          testID="send-location-button"
          label="Send Location"
          onPress={submitLocation}
          loading={isSending}
          disabled={!canSend}
        />
      </View>
    </ScreenContainer>
  );
}
