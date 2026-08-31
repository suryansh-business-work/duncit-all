import { useApolloClient } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { MY_ADMIN_CLUBS_TABLE, type ClubAdminClubInfoRow } from './queries';
import { clubAdminClubsColumns } from './columns';
import { useTranslation } from '@duncit/shell';

const getClubRowId = (club: ClubAdminClubInfoRow) => club.id;

/** "Your Clubs" — server-driven max-info table over the clubs the signed-in
 * partner administers. Row click opens the club's details; the Pods action
 * jumps to that club's pod list. */
export default function ClubAdminClubsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();

  const fetchRows = useApolloTableFetch<ClubAdminClubInfoRow>(
    client,
    MY_ADMIN_CLUBS_TABLE,
    'myAdminClubsTable',
  );

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
      <Stack spacing={0.25}>
        <Typography variant="h5" sx={{
          fontWeight: 950
        }}>{t('partners.clubAdminClubsPage.yourClubs')}</Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Clubs you administer. Click a club to open its details, or jump straight to its pods.
        </Typography>
      </Stack>

      <DuncitTable<ClubAdminClubInfoRow>
        tableId="partners-club-admin-clubs"
        columns={clubAdminClubsColumns(t)}
        fetchRows={fetchRows}
        getRowId={getClubRowId}
        onRowClick={(club) => navigate(`/club-admin/clubs/${club.id}/edit`)}
        emptyText={t('partners.common.noClubsAreAssignedToYou')}
        defaultSort={{ field: 'club_name', dir: 'asc' }}
        searchPlaceholder="Search clubs"
      />
    </Stack>
  );
}
