import { logs } from '@duncit/logs';
import { VenueFoodDashboard } from '@duncit/venue-food';
import { useTranslation } from '@duncit/shell';
import VenueFoodToolPage from '../../components/venue/VenueFoodToolPage';

/**
 * Food Dashboard — the selected venue's food numbers for a period the owner
 * picks: what was ordered and earned, how the orders ended, which dishes sold,
 * how guests rated them and how often the venue's QRs were scanned. The
 * dashboard itself is @duncit/venue-food's, the same one mWeb and the Venues
 * console mount.
 */
export default function VenueFoodDashboardPage() {
  const { t } = useTranslation();
  return (
    <VenueFoodToolPage
      title={t('mweb.studioOptions.foodDashboard')}
      hint={t('mweb.studioOptions.foodDashboardHint')}
      noFoodMessage={t('venueFoodOwner.dashboard.noFood')}
      testId="venue-food-dashboard"
    >
      {(venueId) => <VenueFoodDashboard venueId={venueId} logger={logs.portal['partners-app']} />}
    </VenueFoodToolPage>
  );
}
