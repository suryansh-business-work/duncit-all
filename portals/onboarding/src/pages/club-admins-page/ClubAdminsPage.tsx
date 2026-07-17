import { useMemo, useRef } from 'react';
import { gql, useApolloClient } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import { DuncitTable, useApolloTableFetch, type DuncitColumn, type TableFilterValue } from '@duncit/table';

export const CLUB_ADMINS_TABLE = gql`
  query OnboardingClubAdminsTable($query: TableQueryInput) {
    partnersTable(query: $query) {
      total
      rows {
        user_id
        full_name
        email
        phone_number
        created_at
      }
    }
  }
`;

interface ClubAdminRow {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  created_at?: string | null;
}

const renderPerson = (row: ClubAdminRow) => (
  <>
    <Typography variant="body2" fontWeight={700}>
      {row.full_name || '—'}
    </Typography>
    <Typography variant="caption" color="text.secondary" display="block">
      {row.email || row.phone_number || '—'}
    </Typography>
  </>
);

const joinedValue = (row: ClubAdminRow) =>
  row.created_at ? new Date(row.created_at).toLocaleDateString() : '—';

const getRowId = (row: ClubAdminRow) => row.user_id;

// Pinned into the query so the partners endpoint only returns Club Admins.
const CLUB_ADMIN_FILTER: TableFilterValue[] = [{ field: 'role', op: 'eq', value: 'CLUB_ADMIN' }];

export default function ClubAdminsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useApolloTableFetch<ClubAdminRow>(client, CLUB_ADMINS_TABLE, 'partnersTable');

  const columns = useMemo<DuncitColumn<ClubAdminRow>[]>(
    () => [
      {
        field: 'full_name',
        headerName: 'Club Admin',
        flex: 1,
        minWidth: 220,
        cellRenderer: renderPerson,
        valueGetter: (r) => r.full_name || '—',
      },
      { field: 'phone_number', headerName: 'Phone', minWidth: 140, valueGetter: (r) => r.phone_number || '—' },
      { field: 'created_at', headerName: 'Joined', width: 130, filter: { type: 'date' }, valueGetter: joinedValue },
    ],
    [],
  );

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <GroupsIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Onboarded Club Admins
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Everyone approved through the Club Admin onboarding meeting flow.
          </Typography>
        </Box>
      </Stack>
      <DuncitTable<ClubAdminRow>
        tableId="onboarding-club-admins"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText="No Club Admins onboarded yet."
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder="Search name, email or phone"
        refetchRef={refetchRef}
        externalFilters={CLUB_ADMIN_FILTER}
      />
    </Box>
  );
}
