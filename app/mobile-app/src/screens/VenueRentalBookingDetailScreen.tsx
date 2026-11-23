import { useRoute, type RouteProp } from '@react-navigation/native';
import { Spinner, YStack } from 'tamagui';

import { LoadErrorNotice } from '@/components/club-admin/LoadErrorNotice';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { RentalDetailMoney } from '@/components/venue-rentals-desk/detail/RentalDetailMoney';
import { RentalDetailPeople } from '@/components/venue-rentals-desk/detail/RentalDetailPeople';
import { RentalDetailProofs } from '@/components/venue-rentals-desk/detail/RentalDetailProofs';
import { RentalDetailTimeline } from '@/components/venue-rentals-desk/detail/RentalDetailTimeline';
import { useRentalBookingDetail } from '@/hooks/useRentalBookingDetail';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * Venue Options → Rented Items → one rental (/venues/rented-items/:id): the
 * item, the guest (with a phone to call), the pod, where it goes back, the
 * money, where the deposit's Razorpay refund stands, the proofs and the
 * activity — the venue's view the server shapes (no email, no Razorpay ids).
 * The route's error boundary comes from screenLayout.
 */
export function VenueRentalBookingDetailScreen() {
  const { t } = useTranslation();
  const { id } = useRoute<RouteProp<RootStackParamList, 'VenueRentalBookingDetail'>>().params;
  const { detail, loading, refetch, addProof } = useRentalBookingDetail(id);

  let body;
  if (loading) {
    body = (
      <Spinner
        role="progressbar"
        aria-label={t('venueRentals.detail.loading')}
        color="$primary"
        testID="rental-detail-loading"
      />
    );
  } else if (detail) {
    body = (
      <YStack gap={16}>
        <RentalDetailPeople detail={detail} />
        <RentalDetailMoney detail={detail} />
        <RentalDetailProofs detail={detail} onAddProof={addProof} />
        <RentalDetailTimeline detail={detail} />
      </YStack>
    );
  } else {
    // A failed load, or none at all: say so, never an empty page.
    body = (
      <LoadErrorNotice
        testID="rental-detail-error"
        message={t('venueRentals.detail.loadError')}
        retryLabel={t('venueRentals.detail.retry')}
        onRetry={() => fireAndForget(refetch())}
      />
    );
  }

  return (
    <StackScreen
      title={
        detail
          ? t('venueRentals.detail.title', { vars: { name: detail.booking.name } })
          : t('venueRentals.items.pageTitle')
      }
      testID="rental-detail-screen"
    >
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        {body}
      </RefreshScrollView>
    </StackScreen>
  );
}
