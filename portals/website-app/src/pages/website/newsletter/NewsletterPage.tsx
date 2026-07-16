import { useMemo } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import {
  NEWSLETTER_SOURCES,
  NEWSLETTER_SUBSCRIBERS,
  NEWSLETTER_TABLE,
  type Subscriber,
} from './queries';

const getSubscriberRowId = (row: Subscriber) => row.id;

const SOURCE_OPTIONS = NEWSLETTER_SOURCES.map((source) => ({ value: source, label: source }));

const renderStatus = (row: Subscriber) => (
  <Chip
    size="small"
    label={row.unsubscribed_at ? 'Unsubscribed' : 'Active'}
    color={row.unsubscribed_at ? 'default' : 'success'}
  />
);

export default function NewsletterPage() {
  // KPI cards still need the whole dataset; the table itself is server-paged.
  const { data } = useQuery<{ newsletterSubscribers: Subscriber[] }>(NEWSLETTER_SUBSCRIBERS, {
    fetchPolicy: 'cache-and-network',
  });
  const client = useApolloClient();
  const { formatDateTime } = useDateFormat();

  const all = data?.newsletterSubscribers ?? [];
  const active = all.filter((r) => !r.unsubscribed_at).length;

  const fetchRows = useApolloTableFetch<Subscriber>(client, NEWSLETTER_TABLE, 'newsletterSubscribersTable');

  const columns = useMemo<DuncitColumn<Subscriber>[]>(
    () => [
      { field: 'email', headerName: 'Email', flex: 1, minWidth: 220 },
      {
        field: 'source',
        headerName: 'Source',
        filter: { type: 'select', options: SOURCE_OPTIONS },
        minWidth: 150,
      },
      {
        field: 'status',
        headerName: 'Status',
        sortable: false,
        width: 140,
        cellRenderer: renderStatus,
        valueGetter: (row) => (row.unsubscribed_at ? 'Unsubscribed' : 'Active'),
      },
      {
        field: 'created_at',
        headerName: 'Subscribed',
        filter: { type: 'date' },
        minWidth: 180,
        valueGetter: (row) => formatDateTime(row.created_at),
      },
      {
        field: 'unsubscribed_at',
        headerName: 'Unsubscribed',
        filter: { type: 'date' },
        hide: true,
        minWidth: 180,
        valueGetter: (row) => (row.unsubscribed_at ? formatDateTime(row.unsubscribed_at) : '—'),
      },
    ],
    [formatDateTime],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Newsletter Submission
      </Typography>
      <Stack direction="row" spacing={2}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline">Total</Typography>
            <Typography variant="h4">{all.length}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline">Active</Typography>
            <Typography variant="h4">{active}</Typography>
          </CardContent>
        </Card>
      </Stack>
      <DuncitTable<Subscriber>
        tableId="website-newsletter"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getSubscriberRowId}
        emptyText="No subscribers yet."
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder="Search email or source"
      />
    </Stack>
  );
}
