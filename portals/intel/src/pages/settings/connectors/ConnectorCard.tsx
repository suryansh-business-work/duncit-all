import { useState } from 'react';
import { Alert, Box, Button, Chip, Collapse, FormControlLabel, Paper, Stack, Switch, Typography } from '@mui/material';
import type { IntelConnector, IntelTestResult } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { ConfirmDialog } from '@duncit/dialogs';
import { fireAndForget } from '@duncit/logs';
import { ENV_LABEL_KEYS } from '../../../components/sources';
import { intelLog } from '../../../lib/logger';
import { relativeTime } from '../../../lib/time';
import { CONNECTOR_STATUS_COLOR, CONNECTOR_STATUS_KEYS } from '../../sync/ConnectorFreshness';
import ToolsTable from './ToolsTable';
import type { useConnectorActions } from './useConnectorActions';

interface Props {
  connector: IntelConnector;
  actions: ReturnType<typeof useConnectorActions>;
  testResult: IntelTestResult | null;
  onEdit: () => void;
}

/** This server's own MCP (no tool list to discover) and Gmail mailboxes connected with Google (removed by disconnecting the account). */
const DUNCIT_MCP_ENTRY = 'duncit';
const GMAIL_OAUTH_ENTRY = 'oauth';

const bg = (p: Promise<unknown>, what: string) => fireAndForget(p, intelLog, '/setting', `ConnectorCard.${what}`);

/** One connector: state, credentials entry, freshness, and Test / Sync / Edit / Enable / Delete (+ tools for MCP). */
export default function ConnectorCard({ connector: c, actions, testResult, onEdit }: Readonly<Props>) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const duncitMcp = c.kind === 'MCP' && c.env_entry_id === DUNCIT_MCP_ENTRY;
  const remoteMcp = c.kind === 'MCP' && !duncitMcp;
  const oauthGmail = c.kind === 'GMAIL' && c.env_entry_id === GMAIL_OAUTH_ENTRY;
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1, minWidth: 160 }}>{c.name}</Typography>
        <Chip size="small" label={t(ENV_LABEL_KEYS[c.environment] ?? 'intel.env.STAGING')} color={c.environment === 'PRODUCTION' ? 'error' : 'default'} variant="outlined" />
        <Chip size="small" color={CONNECTOR_STATUS_COLOR[c.status] ?? 'default'} label={t(CONNECTOR_STATUS_KEYS[c.status] ?? 'intel.sync.status.IDLE')} />
        <FormControlLabel control={<Switch checked={c.enabled} onChange={() => bg(actions.toggle(c), 'toggle')} />} label={c.enabled ? t('intel.settings.connectors.on') : t('intel.settings.connectors.off')} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t('intel.settings.connectors.entryLine', { vars: { entry: c.env_entry_name || t('intel.settings.connectors.entryMissing') } })}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p">
        {t('intel.settings.connectors.freshness', { vars: { when: relativeTime(c.last_sync_at, t), count: c.kind === 'MCP' ? c.tools.length : c.indexed_count } })}
      </Typography>
      {duncitMcp && <Alert severity="info" sx={{ mt: 1 }}>{t('intel.settings.connectors.duncitNote')}</Alert>}
      {c.last_error && <Alert severity="error" sx={{ mt: 1 }}>{c.last_error}</Alert>}
      {testResult && (
        <Alert severity={testResult.ok ? 'success' : 'error'} sx={{ mt: 1 }}>
          {testResult.message}
          {testResult.details.length > 0 && <Box component="ul" sx={{ m: 0, pl: 2 }}>{testResult.details.map((d) => <li key={d}>{d}</li>)}</Box>}
        </Alert>
      )}
      <Stack direction="row" sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Button size="small" variant="outlined" disabled={actions.testing} onClick={() => bg(actions.test(c), 'test')}>{t('intel.settings.connectors.test')}</Button>
        <Button size="small" disabled={!c.enabled} onClick={() => bg(actions.sync(c, false), 'sync')}>{t('intel.sync.syncNow')}</Button>
        {remoteMcp && (
          <>
            <Button size="small" disabled={actions.discovering} onClick={() => bg(actions.discover(c), 'discover')}>{t('intel.settings.connectors.discover')}</Button>
            <Button size="small" onClick={() => setShowTools((v) => !v)}>{showTools ? t('intel.settings.connectors.hideTools') : t('intel.settings.connectors.showTools', { vars: { count: c.tools.length } })}</Button>
          </>
        )}
        <Button size="small" onClick={onEdit}>{t('intel.common.edit')}</Button>
        {!oauthGmail && <Button size="small" color="error" onClick={() => setConfirm(true)}>{t('intel.common.delete')}</Button>}
      </Stack>
      {remoteMcp && (
        <Collapse in={showTools} unmountOnExit>
          <Box sx={{ mt: 1.5 }}>
            <ToolsTable connector={c} onClass={(tool, cls) => bg(actions.setToolClass(c, tool, cls), 'class')} />
          </Box>
        </Collapse>
      )}
      <ConfirmDialog open={confirm} title={t('intel.settings.connectors.deleteTitle')} message={t('intel.settings.connectors.deleteText', { vars: { name: c.name } })} destructive confirmLabel={t('intel.common.delete')} onConfirm={() => { setConfirm(false); bg(actions.remove(c), 'remove'); }} onClose={() => setConfirm(false)} />
    </Paper>
  );
}
