import HistoryIcon from '@mui/icons-material/History';
import PodListPage from './pod-list';
import { usePodListFilters } from './pod-list/usePodListFilters';
import FilterMenu from './home-page/FilterMenu';
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
  const f = usePodListFilters();
  // useHomeData already applies category/price/date, so this page narrows
  // through the same rules Home uses — no second implementation. Its order is
  // fixed (newest first), which is why the sort control is hidden below.
  const { previousPods, loading, error, hostNameOf, categoryChips } = useHomeData({
    superCategorySlug,
    locationId,
    zoneName,
    categoryId: f.categoryId,
    priceFilter: f.priceFilter,
    dateFilter: f.dateFilter,
    sortBy: f.sortBy,
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
      filterAction={
        <FilterMenu
          open={f.open}
          onOpenChange={f.setOpen}
          categoryChips={categoryChips}
          categoryId={f.categoryId}
          setCategoryId={f.setCategoryId}
          priceFilter={f.priceFilter}
          setPriceFilter={f.setPriceFilter}
          dateFilter={f.dateFilter}
          setDateFilter={f.setDateFilter}
          sortBy={f.sortBy}
          setSortBy={f.setSortBy}
          locationId={locationId}
          showSort={false}
        />
      }
    />
  );
}
