import { useMemo } from 'react';
import { Stack } from '@mui/material';
import { podRowStatusOptions, type PodRowStatusFilter } from '@duncit/utils';
import PillChips from '../../components/club-admin/PillChips';
import SearchPillField from '../pod-list/SearchPillField';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  search: string;
  onSearch: (value: string) => void;
  status: PodRowStatusFilter;
  onStatus: (value: PodRowStatusFilter) => void;
}

/**
 * The search pill and the status pills over the club's pods. Both are query
 * arguments, so the server pages over the matching pods rather than the list
 * filtering the page it already fetched — and the status vocabulary is the one
 * `@duncit/utils` gives every surface, so a pod is filtered under the same
 * name it is chipped with.
 */
export default function ClubPodsFilters({ search, onSearch, status, onStatus }: Readonly<Props>) {
  const { t } = useTranslation();
  const options = useMemo(() => podRowStatusOptions(t), [t]);

  return (
    <Stack spacing={1.5}>
      <SearchPillField
        value={search}
        onChange={onSearch}
        placeholder={t('mweb.common.search')}
        ariaLabel={t('mweb.common.search')}
        enterKeyHint="search"
      />
      <PillChips label={t('clubAdmin.pods.statusFilter')} options={options} value={status} onChange={onStatus} />
    </Stack>
  );
}
