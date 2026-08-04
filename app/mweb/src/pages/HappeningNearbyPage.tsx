import WhatshotIcon from '@mui/icons-material/Whatshot';
import PodListPage from './pod-list';
import { usePodListFilters } from './pod-list/usePodListFilters';
import FilterMenu from './home-page/FilterMenu';
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
  const f = usePodListFilters();
  // useHomeData already applies category/price/date/sort, so this page narrows
  // through the same rules Home uses — no second implementation.
  const { activePods, loading, error, hostNameOf, categoryChips } = useHomeData({
    superCategorySlug,
    locationId,
    zoneName,
    categoryId: f.categoryId,
    priceFilter: f.priceFilter,
    dateFilter: f.dateFilter,
    sortBy: f.sortBy,
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
