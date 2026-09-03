import { useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import AdminClubRowCard from './AdminClubRow';
import { MWEB_MY_ADMIN_CLUBS, type AdminClubRow } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

/** More clubs than one person administers; the list is not paged. */
const CLUBS_PAGE = { page: 1, page_size: 50, sort_by: 'club_name', sort_dir: 'asc' };

interface BodyProps {
  clubs: AdminClubRow[];
  loading: boolean;
  error?: { message: string };
}

/** Spinner, error, none yet, or the rows — hoisted so it is not redefined. */
function ClubsBody({ clubs, loading, error }: Readonly<BodyProps>) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 3 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (clubs.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('mweb.clubStudio.noClubs')}
      </Typography>
    );
  }
  return (
    <Stack spacing={1}>
      {clubs.map((club) => (
        <AdminClubRowCard key={club.id} club={club} />
      ))}
    </Stack>
  );
}

/**
 * "Your clubs" — every club the signed-in user administers, each with the
 * door to its pods and to its page. Native twin: the same list on ClubManage.
 */
export default function YourClubsSection() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(MWEB_MY_ADMIN_CLUBS, {
    variables: { query: CLUBS_PAGE },
    fetchPolicy: 'cache-and-network',
  });
  const clubs: AdminClubRow[] = data?.myAdminClubsTable?.rows ?? [];

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('mweb.clubStudio.yourClubs')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              {t('mweb.clubStudio.yourClubsSubtitle')}
            </Typography>
          </Stack>
          <ClubsBody clubs={clubs} loading={loading && !data} error={error} />
        </Stack>
      </CardContent>
    </Card>
  );
}
