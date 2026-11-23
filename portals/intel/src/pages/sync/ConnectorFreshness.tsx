import { useMutation } from '@apollo/client/react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SyncIcon from '@mui/icons-material/Sync';
import type { IntelConnector } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { ENV_LABEL_KEYS, SOURCE_LABEL_KEYS, sourceIcon } from '../../components/sources';
import { INTEL_SET_CONNECTOR_PAUSED, INTEL_SYNC_CONNECTOR } from '../../graphql/admin';
import { relativeTime } from '../../lib/time';

export const CONNECTOR_STATUS_KEYS: Record<string, string> = { IDLE: 'intel.sync.status.IDLE', SYNCING: 'intel.sync.status.SYNCING', OK: 'intel.sync.status.OK', ERROR: 'intel.sync.status.ERROR' };
export const CONNECTOR_STATUS_COLOR: Record<string, 'default' | 'info' | 'success' | 'error'> = { IDLE: 'default', SYNCING: 'info', OK: 'success', ERROR: 'error' };

/** One connector's freshness: state, last sync, size — with Sync now, Full sync and Pause/Resume. */
export default function ConnectorFreshness({ connector: c, onChanged }: Readonly<{ connector: IntelConnector; onChanged: () => void }>) {
  const { t } = useTranslation();
  const [sync, syncState] = useMutation(INTEL_SYNC_CONNECTOR);
  const [pause, pauseState] = useMutation(INTEL_SET_CONNECTOR_PAUSED);
  const run = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      notifySuccess(done);
      onChanged();
    } catch (err) {
      notifyError(parseApiError(err, t('intel.sync.actionFailed')));
    }
  };
  const busy = syncState.loading || pauseState.loading;
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: '100%' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Box sx={{ color: 'primary.main', display: 'flex' }} aria-hidden>{sourceIcon(c.kind)}</Box>
        <Typography variant="subtitle2" noWrap sx={{ flex: 1, minWidth: 0 }}>{c.name}</Typography>
        <Chip size="small" color={CONNECTOR_STATUS_COLOR[c.status] ?? 'default'} label={t(CONNECTOR_STATUS_KEYS[c.status] ?? 'intel.sync.status.IDLE')} />
      </Stack>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.75 }}>
        {[t(SOURCE_LABEL_KEYS[c.kind] ?? 'intel.sources.MEDIA'), t(ENV_LABEL_KEYS[c.environment] ?? 'intel.env.STAGING'), t('intel.sync.indexed', { vars: { count: c.indexed_count } })].join(' · ')}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p">
        {t('intel.sync.lastSync', { vars: { when: relativeTime(c.last_sync_at, t) } })}
        {c.sync_paused ? ` · ${t('intel.sync.paused')}` : ''}
        {c.enabled ? '' : ` · ${t('intel.sync.disabled')}`}
      </Typography>
      {c.last_error && <Typography variant="caption" color="error" component="p" sx={{ mt: 0.5, wordBreak: 'break-word' }}>{c.last_error}</Typography>}
      <Stack direction="row" sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
        <Button size="small" startIcon={<SyncIcon />} disabled={busy || !c.enabled} onClick={() => run(() => sync({ variables: { id: c.id, full: false } }), t('intel.sync.queued'))}>
          {t('intel.sync.syncNow')}
        </Button>
        <Button size="small" disabled={busy || !c.enabled} onClick={() => run(() => sync({ variables: { id: c.id, full: true } }), t('intel.sync.queued'))}>
          {t('intel.sync.fullSync')}
        </Button>
        <Button size="small" startIcon={c.sync_paused ? <PlayArrowIcon /> : <PauseIcon />} disabled={busy} onClick={() => run(() => pause({ variables: { id: c.id, paused: !c.sync_paused } }), c.sync_paused ? t('intel.sync.resumed') : t('intel.sync.pausedDone'))}>
          {c.sync_paused ? t('intel.sync.resume') : t('intel.sync.pause')}
        </Button>
      </Stack>
    </Paper>
  );
}
