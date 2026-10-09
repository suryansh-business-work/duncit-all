import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Pagination, Skeleton, Stack } from '@mui/material';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import { DuncitButton } from '@duncit/buttons';
import { brandOrdersPageCount, brandOrdersTableQuery, parseApiError } from '@duncit/utils';
import EmptyState from '../../components/EmptyState';
import StudioPageHeader from '../../components/StudioPageHeader';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useTranslation } from '../../i18n/useTranslation';
import BrandOrderCard from './BrandOrderCard';
import BrandOrdersFilters from './BrandOrdersFilters';
import { BRAND_ORDERS_TABLE } from './queries';

/** The URL of one view — only what differs from the default is written. */
function viewParams(status: string, q: string, page: number): URLSearchParams {
  const out = new URLSearchParams();
  if (status) out.set('status', status);
  if (q) out.set('q', q);
  if (page > 1) out.set('page', String(page));
  return out;
}

/**
 * Brand Studio → Brand Orders (/products/orders): the Pod Shop orders of the
 * partner's own brands, newest first, a page at a time — searchable by order
 * no., buyer or AWB and filterable by status. The view lives in the URL, so
 * coming back from an order lands on the same page. Native twin: BrandOrdersScreen.
 */
export default function BrandOrdersPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const page = Number(params.get('page')) || 1;
  const [search, setSearch] = useState(q);
  const debounced = useDebouncedValue(search.trim());

  // A settled search moves the view back to its first page.
  useEffect(() => {
    if (debounced !== q) setParams(viewParams(status, debounced, 1), { replace: true });
  }, [debounced, q, status, setParams]);

  const { data, loading, error, refetch } = useQuery(BRAND_ORDERS_TABLE, {
    variables: { query: brandOrdersTableQuery({ page, status, search: q }) },
    fetchPolicy: 'cache-and-network',
  });
  const table = data?.brandProductOrdersTable;
  const rows = table?.rows ?? [];
  const filtered = !!status || !!q;
  const setView = (nextStatus: string, nextPage: number) =>
    setParams(viewParams(nextStatus, q, nextPage), { replace: true });

  let body;
  if (loading && !table) {
    body = <Skeleton variant="rounded" height={200} data-testid="brand-orders-loading" />;
  } else if (error && !table) {
    body = (
      <Alert
        severity="error"
        data-testid="brand-orders-error"
        action={
          <DuncitButton color="inherit" size="small" data-testid="brand-orders-retry" onClick={() => refetch().catch(() => undefined)}>
            {t('mweb.brandOrders.retry')}
          </DuncitButton>
        }
      >
        {parseApiError(error, t('mweb.brandOrders.loadFailed'))}
      </Alert>
    );
  } else if (rows.length === 0) {
    body = (
      <EmptyState
        testId="brand-orders-empty"
        icon={<LocalShippingRoundedIcon />}
        title={t(filtered ? 'mweb.brandOrders.emptyFiltered' : 'mweb.brandOrders.empty')}
      />
    );
  } else {
    const pages = brandOrdersPageCount(table?.total ?? 0, table?.page_size);
    body = (
      <>
        <Stack component="ul" data-testid="brand-orders-list" spacing={1.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {rows.map((order) => (
            <BrandOrderCard key={order.id} order={order} />
          ))}
        </Stack>
        {pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Pagination
              data-testid="brand-orders-pager"
              count={pages}
              page={Math.min(page, pages)}
              onChange={(_, next) => setView(status, next)}
              getItemAriaLabel={(type, item) => {
                if (type === 'previous') return t('mweb.brandOrders.previousPage');
                if (type === 'next') return t('mweb.brandOrders.nextPage');
                return t('mweb.brandOrders.pageOf', { vars: { page: item ?? 1, pages } });
              }}
            />
          </Box>
        )}
      </>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ p: 2, maxWidth: 760, mx: 'auto', width: '100%' }} data-testid="brand-orders-page">
      <StudioPageHeader icon={<LocalShippingRoundedIcon fontSize="small" />} title={t('mweb.studioOptions.brandOrders')} />
      <BrandOrdersFilters search={search} status={status} onSearch={setSearch} onStatus={(next) => setView(next, 1)} />
      {body}
    </Stack>
  );
}
