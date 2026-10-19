import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import { DuncitButton } from '@duncit/buttons';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';

import { EmptyState } from '../../components/EmptyState';
import { ProductGrid } from '../../components/ProductGrid';
import { STORE_SEARCH, type StoreSearchInput } from '../../graphql/catalog';
import { useStoreT } from '../../i18n';

/** Divisible by the grid's 2, 3 and 4 columns, so every loaded page ends on a full row. */
const PAGE_SIZE = 24;

const dealsInput = (min: number | null, page: number): StoreSearchInput => ({
  on_sale: true,
  sort: 'DISCOUNT',
  min_discount_pct: min ?? undefined,
  page,
  page_size: PAGE_SIZE,
});

/** One further page of deals ("Load more"), fetched once and kept in the cache. */
function DealsChunk({ min, page }: Readonly<{ min: number | null; page: number }>) {
  const { t } = useStoreT();
  const { data, loading, error } = useQuery(STORE_SEARCH, { variables: { input: dealsInput(min, page) } });
  if (error) return <Alert severity="error">{parseApiError(error, t('ecommStore.common.loadFailed'))}</Alert>;
  if (loading && !data) return <Loader label={t('ecommStore.common.loading')} />;
  const items = data?.storeSearch.items ?? [];
  return items.length > 0 ? <ProductGrid products={items} dense /> : null;
}

/**
 * The deals list for one discount floor: the biggest discounts first, then
 * "Load more" appends the next page below. Mounted with `key={min}`, so a new
 * floor starts again from page one.
 */
export function DealsResults({ min, onShowAll }: Readonly<{ min: number | null; onShowAll: () => void }>) {
  const { t } = useStoreT();
  const [pages, setPages] = useState(1);
  const { data, loading, error } = useQuery(STORE_SEARCH, { variables: { input: dealsInput(min, 1) } });
  const first = data?.storeSearch;

  if (error && !first) return <Alert severity="error">{parseApiError(error, t('ecommStore.common.loadFailed'))}</Alert>;
  if (loading && !first) return <Loader label={t('ecommStore.common.loading')} />;
  if (!first || first.items.length === 0) {
    return (
      <EmptyState
        icon={<LocalOfferOutlinedIcon />}
        title={t('ecommStore.deals.emptyTitle')}
        body={t('ecommStore.deals.emptyBody')}
        action={min === null ? undefined : <DuncitButton variant="contained" onClick={onShowAll}>{t('ecommStore.deals.all')}</DuncitButton>}
      />
    );
  }

  const shown = Math.min(pages * PAGE_SIZE, first.total);
  const extraPages = Array.from({ length: pages - 1 }, (_, index) => index + 2);
  return (
    <Stack spacing={{ xs: 1.5, md: 2 }}>
      <ProductGrid products={first.items} dense />
      {extraPages.map((page) => (
        <DealsChunk key={page} min={min} page={page} />
      ))}
      <Stack spacing={1.5} sx={{ alignItems: 'center', pt: 2 }}>
        <Typography variant="body2" color="text.secondary" role="status">
          {t('ecommStore.deals.showing', { vars: { shown, total: first.total } })}
        </Typography>
        {shown < first.total ? (
          <DuncitButton variant="outlined" onClick={() => setPages((n) => n + 1)}>
            {t('ecommStore.deals.loadMore')}
          </DuncitButton>
        ) : null}
      </Stack>
    </Stack>
  );
}
