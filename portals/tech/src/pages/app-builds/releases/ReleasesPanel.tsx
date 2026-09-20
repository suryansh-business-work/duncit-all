import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { formatDateTime } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import ReleasesTable from './ReleasesTable';
import ReleaseDetailsDialog from './ReleaseDetailsDialog';
import { LogRejectionDialog, type LogRejectionValues } from './log-rejection';
import { useReleaseActions } from './useReleaseActions';
import { STORE_RELEASES, type ReleaseStore, type StoreReleasePage, type StoreReleaseRow } from './queries';

interface Props {
  store: ReleaseStore;
  /** The tab heading — names the grid for screen readers. */
  ariaLabel: string;
}

const BLANK_REJECTION = { version: '', build_number: '' };

/**
 * One store's releases, read from the store the moment the tab opens —
 * `network-only`, because the point of the page is what the store says NOW,
 * and a cached copy would show yesterday's rejection as today's.
 */
export default function ReleasesPanel({ store, ariaLabel }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useQuery<{ storeReleases: StoreReleasePage }>(STORE_RELEASES, {
    variables: { store },
    fetchPolicy: 'network-only',
  });
  const refetch = useCallback(() => query.refetch(), [query]);
  const actions = useReleaseActions(store, refetch);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logging, setLogging] = useState<{ version: string; build_number: string } | null>(null);

  const page = query.data?.storeReleases;
  // Re-found on every read, so a saved reviewer message or a fresh advice
  // shows in the open dialog without closing and reopening it.
  const selected = page?.rows.find((row) => row.id === selectedId) ?? null;

  const openLog = useCallback((row?: StoreReleaseRow) => {
    setLogging(row ? { version: row.version, build_number: row.build_number } : BLANK_REJECTION);
  }, []);

  const onLog = useCallback(
    async (values: LogRejectionValues) => {
      if (await actions.logRejection(values)) setLogging(null);
    },
    [actions]
  );

  if (query.error) return <Alert severity="error">{parseApiError(query.error)}</Alert>;
  if (!page) return <Skeleton height={320} data-testid="releases-loading" />;

  return (
    <Stack spacing={2} data-testid={`releases-panel-${store.toLowerCase()}`}>
      <Stack direction="row" useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', mr: 'auto' }}>
          {page.configured
            ? t('tech.appBuilds.releasesReadAt', { vars: { app: page.app_name || '—', when: formatDateTime(page.fetched_at) } })
            : t('tech.appBuilds.releasesNotConfiguredShort')}
        </Typography>
        <DuncitButton size="small" variant="outlined" startIcon={<RefreshIcon />} loading={query.networkStatus === 4} onClick={refetch}>
          {t('tech.appBuilds.releasesRefresh')}
        </DuncitButton>
        {page.store_url && (
          <DuncitButton size="small" variant="outlined" component="a" href={page.store_url} target="_blank" rel="noreferrer" startIcon={<OpenInNewIcon />}>
            {t('tech.appBuilds.releaseOpenStore')}
          </DuncitButton>
        )}
        <DuncitButton size="small" variant="outlined" onClick={() => openLog()}>
          {t('tech.appBuilds.logRejectionAction')}
        </DuncitButton>
        <DuncitButton size="small" variant="contained" loading={actions.busy.submitting} onClick={actions.submitLatest}>
          {t('tech.appBuilds.submitLatestAction')}
        </DuncitButton>
      </Stack>
      {!page.configured && (
        <Alert
          severity="warning"
          action={
            <DuncitButton size="small" color="inherit" onClick={() => navigate('/app-builds/settings')}>
              {t('tech.appBuilds.releasesOpenSettings')}
            </DuncitButton>
          }
        >
          {t(store === 'APP_STORE' ? 'tech.appBuilds.appStoreNotConfigured' : 'tech.appBuilds.playSettingsNotConfigured')}
        </Alert>
      )}
      {page.error && <Alert severity="error">{t('tech.appBuilds.releasesReadFailed', { vars: { error: page.error } })}</Alert>}
      {page.configured && store === 'GOOGLE_PLAY' && <Alert severity="info">{t('tech.appBuilds.releasesPlayNoReviewApi')}</Alert>}
      <ReleasesTable store={store} rows={page.rows} onRowClick={(row) => setSelectedId(row.id)} ariaLabel={ariaLabel} />
      <ReleaseDetailsDialog
        row={selected}
        storeUrl={page.store_url}
        actions={actions}
        onClose={() => setSelectedId(null)}
        onLogRejection={openLog}
      />
      <LogRejectionDialog
        open={logging !== null}
        initial={logging ?? BLANK_REJECTION}
        busy={actions.busy.logging}
        onClose={() => setLogging(null)}
        onSubmit={onLog}
      />
    </Stack>
  );
}
