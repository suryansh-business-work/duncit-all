import { useCallback, useRef } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { logs } from '@duncit/logs';
import ClubSlotRequestsTable from './ClubSlotRequestsTable';
import {
  CLUB_SLOT_REQUESTS_TABLE,
  RESOLVE_CLUB_SLOT_REQUEST,
  type ClubSlotRequestRow,
} from './queries';

/**
 * Clubs > Requests for Club Admins — every time a host could not create a pod
 * because no venue of the club had an open slot. The club admins were already
 * messaged on WhatsApp and email; staff close a request once slots are open.
 */
export default function ClubSlotRequestsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const fetchRows = useApolloTableFetch<ClubSlotRequestRow>(
    client,
    CLUB_SLOT_REQUESTS_TABLE,
    'clubSlotRequestsTable',
  );
  const [resolve] = useMutation(RESOLVE_CLUB_SLOT_REQUEST);

  const onResolve = useCallback(
    async (row: ClubSlotRequestRow) => {
      try {
        await resolve({ variables: { id: row.id } });
        notifySuccess(t('directory.clubs.resolvedToast'));
        refetchRef.current?.();
      } catch (error) {
        notifyError(t('directory.clubs.resolveFailed'));
        logs.portal.clubs.error('ClubSlotRequestsPage', 'resolve', { error, request_id: row.id });
      }
    },
    [resolve, t],
  );

  return (
    <Stack spacing={2.5} data-testid="club-slot-requests-page">
      <PageHeader
        title={t('directory.clubs.slotRequestsTitle')}
        subtitle={t('directory.clubs.slotRequestsSubtitle')}
      />
      <ClubSlotRequestsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        formatDateTime={formatDateTime}
        onResolve={onResolve}
      />
    </Stack>
  );
}
