import HistoryIcon from '@mui/icons-material/History';
import PodListPage from './pod-list';
import { useHomeData } from './home-page/useHomeData';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  superCategorySlug: string;
  locationId: string;
  zoneName: string;
}

/** Dedicated page listing pods that have already taken place (past date) for the
 * selected city/super-category — reached from the Home "Previous Pods" section. */
export default function PreviousPodsPage({ superCategorySlug, locationId, zoneName }: Readonly<Props>) {
  const { t } = useTranslation();
  const { previousPods, loading, error, hostNameOf } = useHomeData({
    superCategorySlug,
    locationId,
    zoneName,
    categoryId: '',
    priceFilter: 'ALL',
    dateFilter: 'ALL',
    sortBy: 'DATE_DESC',
  });

  return (
    <PodListPage
      title={t('mweb.home.previousPodsTitle')}
      subtitle={t('mweb.home.previousPodsSubtitle')}
      icon={<HistoryIcon color="primary" />}
      pods={previousPods}
      loading={loading}
      error={error}
      emptyText={t('mweb.home.previousPodsEmpty')}
      hostNameOf={hostNameOf}
    />
  );
}
