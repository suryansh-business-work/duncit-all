import { useCallback, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import type { TableQueryState } from '@duncit/table';
import { BOUNCER_CALLBACK_REQUESTS, type CallbackRequestPage } from '../../graphql/bouncer';
import { useSupportSocket } from '../../lib/useSupportSocket';
import { supportListVars } from '../../lib/supportTable';
import CallbacksTable from './CallbacksTable';

export default function CallbacksListPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query<{ bouncerCallbackRequests: CallbackRequestPage }>({
        query: BOUNCER_CALLBACK_REQUESTS,
        variables: supportListVars(q),
        fetchPolicy: 'network-only',
      });
      return { rows: data.bouncerCallbackRequests.items, total: data.bouncerCallbackRequests.total };
    },
    [client]
  );

  useSupportSocket({
    onCallback: () => refetchRef.current?.(),
    onCallbackUpdate: () => refetchRef.current?.(),
  });

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Callback Requests"
        subtitle="Users who asked for a call back. Open one to mark it contacted or close it."
      />
      <CallbacksTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onRowClick={(req) => navigate(`/callbacks/${req.id}`)}
      />
    </Stack>
  );
}
