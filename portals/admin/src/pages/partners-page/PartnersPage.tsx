import { useMemo, useRef } from 'react';
import { gql, useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, Stack, Typography } from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';

export const PARTNERS_TABLE = gql`
  query PartnersTable($query: TableQueryInput) {
    partnersTable(query: $query) {
      total
      rows {
        user_id
        full_name
        email
        phone_number
        roles
        created_at
      }
    }
  }
`;

interface PartnerRow {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  roles?: string[] | null;
  created_at?: string | null;
}

/** Partner-portal roles → human labels (mirrors the server's PARTNER_ROLE_LABELS). */
const PARTNER_TYPES: Record<string, string> = {
  HOST: 'Host',
  VENUE_OWNER: 'Venue Partner',
  ECOMM_MANAGER: 'Product Seller',
  CLUB_ADMIN: 'Club Admin',
};

const TYPE_OPTIONS = Object.entries(PARTNER_TYPES).map(([value, label]) => ({ value, label }));

const partnerTypesOf = (row: PartnerRow) =>
  (row.roles ?? []).filter((r) => PARTNER_TYPES[r]).map((r) => PARTNER_TYPES[r]);

const renderTypes = (row: PartnerRow) => (
  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
    {partnerTypesOf(row).map((label) => (
      <Chip key={label} size="small" variant="outlined" color="primary" label={label} />
    ))}
  </Stack>
);

const renderPartner = (row: PartnerRow) => (
  <>
    <Typography variant="body2" fontWeight={700}>
      {row.full_name || '—'}
    </Typography>
    <Typography variant="caption" color="text.secondary" display="block">
      {row.email || row.phone_number || '—'}
    </Typography>
  </>
);

const joinedValue = (row: PartnerRow) =>
  row.created_at ? new Date(row.created_at).toLocaleDateString() : '—';

const getRowId = (row: PartnerRow) => row.user_id;

/** Admin → Partners: every user holding a partner role, filterable by type.
 * Clicking a row opens the common user-details page. */
export default function PartnersPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useApolloTableFetch<PartnerRow>(client, PARTNERS_TABLE, 'partnersTable');

  const columns = useMemo<DuncitColumn<PartnerRow>[]>(
    () => [
      { field: 'full_name', headerName: 'Partner', flex: 1, minWidth: 200, cellRenderer: renderPartner, valueGetter: (r) => r.full_name || '—' },
      { field: 'role', headerName: 'Partner type', minWidth: 220, sortable: false, filter: { type: 'select', options: TYPE_OPTIONS }, cellRenderer: renderTypes, valueGetter: (r) => partnerTypesOf(r).join(', ') },
      { field: 'phone_number', headerName: 'Phone', minWidth: 140, valueGetter: (r) => r.phone_number || '—' },
      { field: 'created_at', headerName: 'Joined', width: 125, filter: { type: 'date' }, valueGetter: joinedValue },
    ],
    [],
  );

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <HandshakeIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Partners
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Everyone with partner access — hosts, venue partners, product sellers and club admins.
          </Typography>
        </Box>
      </Stack>
      <DuncitTable<PartnerRow>
        tableId="admin-partners"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        onRowClick={(row) => navigate(`/users/${row.user_id}`)}
        emptyText="No partners yet."
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder="Search name, email or phone"
        refetchRef={refetchRef}
      />
    </Box>
  );
}
