import { useEffect, type ReactNode } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { useBookingDetail } from '@/hooks/useBookingDetail';
import type { RootStackParamList } from '@/navigation/types';
import { toErrorMessage } from '@/utils/errors';

/** Landing screen for a booking deep link (`/booking/:bookingId`) — the target
 * of the payment-receipt email's "View Booking" button. The server resolves the
 * booking (rejecting anyone who does not own it) and the screen replaces itself
 * with that pod's detail screen. RN twin of mWeb's BookingPage (rule 27). */
export function BookingScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Booking'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const bookingId = route.params?.bookingId ?? '';
  const { booking, isLoading, error } = useBookingDetail(bookingId);

  useEffect(() => {
    if (!booking) return;
    navigation.replace('PodDetails', {
      clubSlug: booking.club_slug,
      podSlug: booking.pod_slug,
      title: booking.pod_title,
    });
  }, [booking, navigation]);

  let body: ReactNode;
  if (isLoading || booking) {
    body = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner testID="booking-loading" color="$primary" />
      </YStack>
    );
  } else {
    body = (
      <Text testID="booking-error" padding={24} color="$danger">
        {toErrorMessage(error, 'This booking could not be found.')}
      </Text>
    );
  }

  // TODO(i18n) — screen title ships as a literal until this feature is localized.
  return (
    <StackScreen title="Your Booking" testID="booking-screen">
      {body}
    </StackScreen>
  );
}
