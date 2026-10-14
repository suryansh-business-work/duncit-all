import { VenueFoodOrders } from '@duncit/venue-food';
import { useTranslation } from '@duncit/shell';
import VenueFoodToolPage from '../../components/venue/VenueFoodToolPage';

/**
 * Food Orders — the paid orders guests placed by scanning the selected venue's
 * QR. The owner moves each one through the kitchen, or cancels it with a full
 * refund. The board is @duncit/venue-food's, the same one mWeb and the Venues
 * console mount.
 */
export default function VenueFoodOrdersPage() {
  const { t } = useTranslation();
  return (
    <VenueFoodToolPage
      title={t('mweb.studioOptions.foodOrders')}
      hint={t('mweb.studioOptions.foodOrdersHint')}
      noFoodMessage={t('venueFoodOwner.orders.noFood')}
      testId="venue-food-orders"
    >
      {(venueId) => <VenueFoodOrders venueId={venueId} surface="partners-app" />}
    </VenueFoodToolPage>
  );
}
