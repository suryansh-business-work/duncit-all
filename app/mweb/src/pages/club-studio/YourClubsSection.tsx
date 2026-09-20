import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useDebouncedValue } from '@duncit/ui';
import { Alert, Card, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import SectionHeader from '../../components/SectionHeader';
import SearchPillField from '../pod-list/SearchPillField';
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
      <Stack data-testid="your-clubs-section-loading" sx={{ alignItems: 'center', py: 3 }}>
        <CircularProgress aria-label={t('mweb.a11y.loading')} size={22} />
      </Stack>
    );
  }
  if (error) {
    return (
      <Alert data-testid="your-clubs-section-error" severity="error" sx={{ m: 2 }}>
        {error.message}
      </Alert>
    );
  }
  if (clubs.length === 0) {
    return (
      <Typography data-testid="your-clubs-section-empty" variant="body2" sx={{ color: 'text.secondary', p: 2 }}>
        {t('mweb.clubStudio.noClubs')}
      </Typography>
    );
  }
  return (
    <Stack divider={<Divider sx={{ mx: 2 }} />}>
      {clubs.map((club) => (
        <AdminClubRowCard key={club.id} club={club} />
      ))}
    </Stack>
  );
}

/**
 * "Your clubs" — every club the signed-in user administers, each with the
 * door to its pods and to its page, as rows of one card. Native twin: the
 * same list on ClubManage.
 */
export default function YourClubsSection() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim(), 300);
  // Server-side, like the native twin's: the list is capped at fifty, so
  // filtering what is already on screen would hide clubs past the cap from
  // exactly the admin who runs most of them.
  const { data, loading, error } = useQuery<any>(MWEB_MY_ADMIN_CLUBS, {
    variables: { query: { ...CLUBS_PAGE, search: search || null } },
    fetchPolicy: 'cache-and-network',
  });
  const clubs: AdminClubRow[] = data?.myAdminClubsTable?.rows ?? [];
  const searchLabel = t('clubAdmin.clubs.search');

  return (
    <Stack data-testid="your-clubs-section" spacing={1.5}>
      <SectionHeader testId="your-clubs-section-header" title={t('mweb.clubStudio.yourClubs')} />
      <SearchPillField
        value={query}
        onChange={setQuery}
        placeholder={searchLabel}
        ariaLabel={searchLabel}
        enterKeyHint="search"
        testId="your-clubs-section-search"
      />
      <Card>
        <ClubsBody clubs={clubs} loading={loading && !data} error={error} />
      </Card>
    </Stack>
  );
}
