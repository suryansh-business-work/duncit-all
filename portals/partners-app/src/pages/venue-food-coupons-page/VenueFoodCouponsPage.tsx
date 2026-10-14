import { VenueFoodCoupons } from '@duncit/venue-food';
import { useTranslation } from '@duncit/shell';
import VenueFoodToolPage from '../../components/venue/VenueFoodToolPage';

/**
 * Food Coupons — the codes the selected venue gives its own food guests. The
 * venue funds them and they work on that venue's food orders only. The list
 * and its form are @duncit/venue-food's, the same ones mWeb and the Venues
 * console mount.
 */
export default function VenueFoodCouponsPage() {
  const { t } = useTranslation();
  return (
    <VenueFoodToolPage
      title={t('mweb.studioOptions.foodCoupons')}
      hint={t('mweb.studioOptions.foodCouponsHint')}
      noFoodMessage={t('venueFoodOwner.coupons.noFood')}
      testId="venue-food-coupons"
    >
      {(venueId) => <VenueFoodCoupons venueId={venueId} surface="partners-app" />}
    </VenueFoodToolPage>
  );
}
