import { useRef } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Alert, Box, LinearProgress, Stack, Typography } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import ChangeDatabaseGuide from './ChangeDatabaseGuide';
import CollectionsTable from './CollectionsTable';
import ConnectionCard from './ConnectionCard';
import ConnectionEvents from './ConnectionEvents';
import ServerCard from './ServerCard';
import StorageTiles from './StorageTiles';
import {
  DATABASE_COLLECTIONS_TABLE,
  DATABASE_INFO,
  type DatabaseCollection,
  type DatabaseInfo,
} from './queries';

/** Why storage/server are missing: the driver's own error, or simply no connection. */
function StatsNotice({ info }: Readonly<{ info: DatabaseInfo }>) {
  const { t } = useTranslation();
  if (info.statsError) {
    return <Alert severity="error">{t('tech.dbInfo.statsError', { vars: { message: info.statsError } })}</Alert>;
  }
  if (!info.storage) return <Alert severity="error">{t('tech.dbInfo.notConnected')}</Alert>;
  return null;
}

/**
 * Database > Info.
 *
 * Which MongoDB this environment's API is on (read-only, password masked), how
 * big it is, what its connection has been through since the process started,
 * and how to point it somewhere else — which is a GitHub secret and a deploy,
 * never a button here.
 */
export default function DbInfoPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { data, loading, error, refetch } = useQuery<{ techDatabaseInfo: DatabaseInfo }>(DATABASE_INFO, {
    fetchPolicy: 'cache-and-network',
  });
  const info = data?.techDatabaseInfo;
  const fetchRows = useApolloTableFetch<DatabaseCollection>(
    client,
    DATABASE_COLLECTIONS_TABLE,
    'techDatabaseCollectionsTable',
  );

  const handleRefresh = () => {
    refetchRef.current?.();
    return refetch();
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <StorageIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
            {t('tech.dbInfo.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tech.dbInfo.subtitle')}
          </Typography>
        </Box>
        <DuncitButton
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          {t('tech.server.refresh')}
        </DuncitButton>
      </Stack>

      {loading && <LinearProgress />}
      {error && <Alert severity="error">{t('tech.dbInfo.loadError', { vars: { message: error.message } })}</Alert>}

      {info && (
        <>
          <StatsNotice info={info} />
          {info.storage && <StorageTiles storage={info.storage} />}
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <ConnectionCard connection={info.connection} pingMs={info.pingMs} />
            {info.server && <ServerCard server={info.server} />}
          </Box>
          <ChangeDatabaseGuide connection={info.connection} />
          <ConnectionEvents events={info.events} />
          {info.storage && (
            <CollectionsTable
              databaseName={info.connection.databaseName}
              fetchRows={fetchRows}
              refetchRef={refetchRef}
            />
          )}
        </>
      )}
    </Stack>
  );
}
