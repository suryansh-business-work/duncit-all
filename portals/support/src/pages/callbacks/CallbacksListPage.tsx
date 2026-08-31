import { useCallback, useRef } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import type { TableQueryState } from '@duncit/table';
import { BOUNCER_CALLBACK_REQUESTS, type CallbackRequestPage } from '../../graphql/bouncer';
import { useSupportSocket } from '../../lib/useSupportSocket';
import { supportListVars } from '../../lib/supportTable';
import CallbacksTable from './CallbacksTable';
import { useTranslation } from '@duncit/shell';

export default function CallbacksListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query<{ bouncerCallbackRequests: CallbackRequestPage }>({
        query: BOUNCER_CALLBACK_REQUESTS,
        variables: supportListVars(q),
        fetchPolicy: 'network-only',
        // A failed query rejects, so a resolved one always carries data.
        // Apollo v4 types it as optional anyway, and an empty page is the
        // honest reading of the case the type insists on.
        errorPolicy: 'none',
      });
      return { rows: data?.bouncerCallbackRequests.items ?? [], total: data?.bouncerCallbackRequests.total ?? 0 };
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
        title={t('support.callbacks.title')}
        subtitle={t('support.callbacks.subtitle')}
      />
      <CallbacksTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onRowClick={(req) => navigate(`/callbacks/${req.id}`)}
      />
    </Stack>
  );
}
