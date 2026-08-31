import { useCallback, useRef } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import type { TableQueryState } from '@duncit/table';
import { BOUNCER_SOS_ALERTS, type SosAlertPage } from '../../graphql/bouncer';
import { useSupportSocket } from '../../lib/useSupportSocket';
import { supportListVars } from '../../lib/supportTable';
import SosTable from './SosTable';
import { useTranslation } from '@duncit/shell';

export default function SosListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query<{ bouncerSosAlerts: SosAlertPage }>({
        query: BOUNCER_SOS_ALERTS,
        variables: supportListVars(q),
        fetchPolicy: 'network-only',
        // A failed query rejects, so a resolved one always carries data.
        // Apollo v4 types it as optional anyway, and an empty page is the
        // honest reading of the case the type insists on.
        errorPolicy: 'none',
      });
      return { rows: data?.bouncerSosAlerts.items ?? [], total: data?.bouncerSosAlerts.total ?? 0 };
    },
    [client]
  );

  useSupportSocket({
    onSos: () => refetchRef.current?.(),
    onSosUpdate: () => refetchRef.current?.(),
  });

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('support.sos.title')}
        subtitle={t('support.sos.subtitle')}
      />
      <SosTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onRowClick={(a) => navigate(`/sos/${a.id}`)}
      />
    </Stack>
  );
}
