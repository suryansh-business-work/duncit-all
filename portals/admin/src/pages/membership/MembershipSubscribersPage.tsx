import { useMemo, useRef } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { SUBSCRIBERS_TABLE } from './queries';
import { useTranslation } from '@duncit/shell';

interface SubscriberRow {
  id: string;
  user_id: string;
  email: string;
  name: string;
  created_at: string;
}

const getSubscriberRowId = (r: SubscriberRow) => r.id;

/**
 * Admin > Membership > Subscribers — everyone who asked to be told when
 * membership opens.
 *
 * Read-only by design: a row is created by the member tapping "Notify me", and
 * the address is stamped from their profile, so there is nothing here for an
 * admin to type or correct.
 */
export default function MembershipSubscribersPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { formatDateTime } = useDateFormat();

  const fetchRows = useApolloTableFetch<SubscriberRow>(
    client,
    SUBSCRIBERS_TABLE,
    'membershipNewsSubscribersTable'
  );

  const columns = useMemo<DuncitColumn<SubscriberRow>[]>(
    () => [
      { field: 'email', headerName: t('shell.common.email'), flex: 1, minWidth: 240 },
      {
        field: 'name',
        headerName: t('shell.common.name'),
        minWidth: 200,
        valueGetter: (r) => r.name || '—',
      },
      {
        field: 'created_at',
        headerName: t('admin.membership.signedUp'),
        minWidth: 200,
        valueGetter: (r) => (r.created_at ? formatDateTime(r.created_at) : ''),
      },
    ],
    [formatDateTime]
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{
          fontWeight: 700
        }}>
          Membership subscribers
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Members who tapped &ldquo;Notify me&rdquo; on the Membership screen. Their email comes
          from their profile, so every address here is one they have already verified.
        </Typography>
      </Box>

      <DuncitTable<SubscriberRow>
        tableId="admin-membership-subscribers"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getSubscriberRowId}
        emptyText={t('admin.membership.subscribersEmpty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder="Search email or name"
        refetchRef={refetchRef}
      />
    </Stack>
  );
}
