import { useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Pagination, Stack } from '@mui/material';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import { DuncitButton } from '@duncit/buttons';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';

import { EmptyState } from '../../components/EmptyState';
import { ProductGrid } from '../../components/ProductGrid';
import { STORE_SEARCH } from '../../graphql/catalog';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';
import { FilterPanel } from './filter-panel';
import { FilterScreen } from './FilterScreen';
import { ActiveFilterChips, ShelfToolbar } from './ShelfToolbar';
import { PAGE_SIZE, toSearchInput, useShelfFilters, type ShelfScope } from './useShelfFilters';

interface ShelfViewProps {
  scope: ShelfScope;
  /** The page's own heading block (title, banner, breadcrumbs). */
  header: ReactNode;
}

const PAGE_LABELS = {
  page: 'ecommStore.shelf.page.page',
  first: 'ecommStore.shelf.page.first',
  last: 'ecommStore.shelf.page.last',
  next: 'ecommStore.shelf.page.next',
  previous: 'ecommStore.shelf.page.previous',
  'start-ellipsis': 'ecommStore.shelf.page.more',
  'end-ellipsis': 'ecommStore.shelf.page.more',
} as const;

/**
 * Every product listing: a filter sidebar on a desktop (a full screen on a
 * phone), sort, active-filter chips, the grid and paging — all in the URL.
 */
export function ShelfView({ scope, header }: Readonly<ShelfViewProps>) {
  const { t } = useStoreT();
  const controls = useShelfFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const input = toSearchInput(controls.filters, scope);
  const { data, previousData, loading, error } = useQuery(STORE_SEARCH, { variables: { input } });
  const page = (data ?? previousData)?.storeSearch;
  const pageCount = page ? Math.ceil(page.total / PAGE_SIZE) : 0;

  return (
    <Stack spacing={2}>
      {header}
      <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Box
          component="aside"
          aria-label={t('ecommStore.filters.title')}
          sx={{ display: { xs: 'none', md: 'block' }, width: 260, flexShrink: 0, bgcolor: T.surface, borderRadius: `${T.radius.card}px`, p: 2, position: 'sticky', top: 170 }}
        >
          <FilterPanel page={page} controls={controls} scope={scope} />
        </Box>
        <Stack spacing={2} sx={{ flexGrow: 1, minWidth: 0 }}>
          <ShelfToolbar page={page} controls={controls} onOpenFilters={() => setFiltersOpen(true)} />
          <ActiveFilterChips page={page} controls={controls} />
          {error ? <Alert severity="error">{parseApiError(error, t('ecommStore.common.loadFailed'))}</Alert> : null}
          {loading && !page ? <Loader label={t('ecommStore.common.loading')} /> : null}
          {page && page.items.length === 0 ? (
            <EmptyState
              icon={<SearchOffRoundedIcon />}
              title={t('ecommStore.shelf.emptyTitle')}
              body={t('ecommStore.shelf.emptyBody')}
              action={<DuncitButton onClick={controls.clearAll}>{t('ecommStore.filters.clearAll')}</DuncitButton>}
            />
          ) : null}
          {page && page.items.length > 0 ? <ProductGrid products={page.items} dense /> : null}
          {pageCount > 1 ? (
            <Stack sx={{ alignItems: 'center', pt: 2 }}>
              <Pagination
                count={pageCount}
                page={controls.filters.page}
                onChange={(_event, next) => controls.setPage(next)}
                shape="rounded"
                getItemAriaLabel={(type, number, selected) =>
                  t(selected ? 'ecommStore.shelf.page.current' : PAGE_LABELS[type], { vars: { n: number ?? 0 } })
                }
              />
            </Stack>
          ) : null}
        </Stack>
      </Stack>
      <FilterScreen open={filtersOpen} onClose={() => setFiltersOpen(false)} page={page} controls={controls} scope={scope} />
    </Stack>
  );
}
