import { useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { LITE_EVENTS } from '../../graphql/events';
import type { LiteEventFilterVars } from '../../graphql/types';
import { EventList } from './EventList';

const PAGE_SIZE = 18;

interface EventListPageProps {
  title: string;
  subtitle?: string;
  filter: LiteEventFilterVars;
  emptyTitle: string;
  emptyBody?: string;
  /** Rendered between the header and the list (a search box, a city switch). */
  toolbar?: ReactNode;
}

/** A paginated list of events for a city, a category or a search, grouped by day with "Load more". */
export function EventListPage({ title, subtitle, filter, emptyTitle, emptyBody, toolbar }: Readonly<EventListPageProps>) {
  const { t } = useWebT();
  const [loadingMore, setLoadingMore] = useState(false);
  const { data, loading, error, fetchMore } = useQuery(LITE_EVENTS, {
    variables: { filter, page: 1, page_size: PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
  });
  const page = data?.liteEvents;
  const rows = page?.rows ?? [];
  const hasMore = page ? page.page * page.page_size < page.total : false;

  const loadMore = async () => {
    if (!page) return;
    setLoadingMore(true);
    try {
      await fetchMore({
        variables: { filter, page: page.page + 1, page_size: PAGE_SIZE },
        updateQuery: (previous, { fetchMoreResult }) => ({
          liteEvents: { ...fetchMoreResult.liteEvents, rows: [...previous.liteEvents.rows, ...fetchMoreResult.liteEvents.rows] },
        }),
      });
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Stack spacing={3} data-testid="event-list-page">
      <PageHeader title={title} subtitle={subtitle} titleVariant="h4" />
      {toolbar}
      <QueryGuard loading={loading && !page} error={error} loadingLabel={t('lite.common.loading')}>
        <EventList events={rows} emptyTitle={emptyTitle} emptyBody={emptyBody} />
        {hasMore ? (
          <Stack sx={{ alignItems: 'center', pt: 1 }}>
            <DuncitButton variant="outlined" onClick={loadMore} loading={loadingMore} data-testid="load-more">
              {t('liteWeb.events.loadMore')}
            </DuncitButton>
          </Stack>
        ) : null}
      </QueryGuard>
    </Stack>
  );
}
