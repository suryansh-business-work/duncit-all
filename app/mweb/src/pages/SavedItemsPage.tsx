import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useTranslation } from '../i18n/useTranslation';
import PageHeader from '../components/PageHeader';
import { SAVED_CATEGORIES, SAVED_ITEMS, type SavedPod } from './saved-items-page/queries';
import { DEFAULT_SAVED_FILTERS, effectiveCategoryId, type SavedFilters } from './saved-items-page/savedItemsFilter';
import SavedItemsToolbar from './saved-items-page/SavedItemsToolbar';
import SavedItemsBody from './saved-items-page/SavedItemsBody';

export default function SavedItemsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<SavedFilters>(DEFAULT_SAVED_FILTERS);
  const debouncedSearch = useDebouncedValue(searchText.trim());

  const { data: catData } = useQuery<any>(SAVED_CATEGORIES, { fetchPolicy: 'cache-first' });
  const categories = catData?.categories ?? [];

  const { data, loading, error } = useQuery<any>(SAVED_ITEMS, {
    variables: {
      search: debouncedSearch || null,
      categoryId: effectiveCategoryId(filters),
      sort: filters.sort,
    },
    fetchPolicy: 'cache-and-network',
  });
  const pods: SavedPod[] = data?.mySavedPods ?? [];

  const openPod = (pod: SavedPod) => {
    if (pod.club_slug && pod.pod_id) navigate(`/club/${pod.club_slug}/pod/${pod.pod_id}`);
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <PageHeader title={t('mweb.saved.savedItems')} onBack={() => navigate(-1)} />

      <SavedItemsToolbar
        search={searchText}
        onSearch={setSearchText}
        filters={filters}
        onFilters={setFilters}
        categories={categories}
      />

      <SavedItemsBody
        loading={loading}
        hasData={Boolean(data)}
        error={error?.message}
        pods={pods}
        onOpen={openPod}
      />
    </Stack>
  );
}
