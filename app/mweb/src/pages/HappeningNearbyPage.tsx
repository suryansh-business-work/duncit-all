import WhatshotIcon from '@mui/icons-material/Whatshot';
import PodListPage from './pod-list';
import { useHomeData } from './home-page/useHomeData';
import { useActiveAds } from '../components/ads/useActiveAds';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  superCategorySlug: string;
  locationId: string;
  zoneName: string;
}

/** Dedicated page listing every live (upcoming) pod for the selected
 * city/super-category — reached from the Home "Happening nearby" section. */
export default function HappeningNearbyPage({
  superCategorySlug,
  locationId,
  zoneName,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { activePods, loading, error, hostNameOf } = useHomeData({
    superCategorySlug,
    locationId,
    zoneName,
    categoryId: '',
    priceFilter: 'ALL',
    dateFilter: 'ALL',
    sortBy: 'DATE_ASC',
  });
  const { ads } = useActiveAds('POD_LIST');

  return (
    <PodListPage
      title={t('mweb.home.happeningNearbyTitle')}
      subtitle={t('mweb.home.happeningNearbySubtitle')}
      icon={<WhatshotIcon color="primary" />}
      pods={activePods}
      ads={ads}
      loading={loading}
      error={error}
      emptyText={t('mweb.home.happeningNearbyEmpty')}
      hostNameOf={hostNameOf}
    />
  );
}
