import { useApolloClient, useQuery } from '@apollo/client/react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router';
import { Alert, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import InactiveHostsAlert from './InactiveHostsAlert';
import { clubHostColumns } from './hostColumns';
import {
  CLUB_ADMIN_CLUB_HOSTS_SUMMARY,
  CLUB_ADMIN_CLUB_HOSTS_TABLE,
  type ClubHostRow,
  type ClubHostsSummary,
} from './queries';

const getHostRowId = (host: ClubHostRow) => host.user_id;

/**
 * Club Admin › Your Clubs › Hosts — everyone who hosts this club's pods, how to
 * reach them, their last pod and this month's score. Hosts with no completed
 * pod inside Pod Settings' inactivity window are yellow, under a warning that
 * asks the club admin to get in touch. A row opens the host's own page.
 */
export default function ClubAdminHostsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { clubId = '' } = useParams();
  const navigate = useNavigate();
  const client = useApolloClient();
  const summary = useQuery<{ clubAdminClubHostsSummary: ClubHostsSummary }>(CLUB_ADMIN_CLUB_HOSTS_SUMMARY, {
    variables: { club_id: clubId },
    fetchPolicy: 'cache-and-network',
  });
  const fetchRows = useApolloTableFetch<ClubHostRow>(
    client,
    CLUB_ADMIN_CLUB_HOSTS_TABLE,
    'clubAdminClubHostsTable',
    { extraVariables: { club_id: clubId } },
    [clubId],
  );
  const data = summary.data?.clubAdminClubHostsSummary;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
          >
            <Stack spacing={0.25}>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                {t('clubAdmin.hosts.eyebrow')}
              </Typography>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 950 }} data-testid="club-hosts-title">
                {data?.club_name ?? <Skeleton width={180} />}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('clubAdmin.hosts.subtitle')}
              </Typography>
            </Stack>
            <DuncitButton
              variant="outlined"
              component={RouterLink}
              to="/club-admin/clubs"
              startIcon={<ArrowBackIcon />}
              data-testid="club-hosts-back"
            >
              {t('clubAdmin.hosts.backToClubs')}
            </DuncitButton>
          </Stack>
          {summary.error && <Alert severity="error">{summary.error.message}</Alert>}
          {data && <InactiveHostsAlert summary={data} />}
          <DuncitTable<ClubHostRow>
            tableId="partners-club-admin-hosts"
            ariaLabel={t('clubAdmin.hosts.hostsAction')}
            columns={clubHostColumns(t)}
            fetchRows={fetchRows}
            getRowId={getHostRowId}
            onRowClick={(host) => navigate(`/club-admin/clubs/${clubId}/hosts/${host.user_id}`)}
            getRowStyle={(host) =>
              host.is_inactive ? { backgroundColor: alpha(theme.palette.warning.main, 0.1) } : undefined
            }
            emptyText={t('clubAdmin.hosts.noHosts')}
            searchPlaceholder={t('clubAdmin.hosts.search')}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
