import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Button, Skeleton, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { IntelConnector } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { fireAndForget } from '@duncit/logs';
import { EmptyState, SectionCard } from '@duncit/ui';
import { INTEL_CONNECTORS, INTEL_ENTRY_OPTIONS, type ConnectorsData, type EntryOptionsData } from '../../../graphql/admin';
import { intelLog } from '../../../lib/logger';
import { ConnectorForm, toConnectorValues, type ConnectorKind } from './connector-form';
import ConnectorCard from './ConnectorCard';
import { useConnectorActions } from './useConnectorActions';

const TITLE_KEYS: Record<ConnectorKind, string> = {
  MONGODB: 'intel.settings.sections.database',
  MCP: 'intel.settings.sections.mcp',
  SLACK: 'intel.settings.sections.slack',
  GMAIL: 'intel.settings.sections.gmail',
  GITHUB: 'intel.settings.sections.github',
};
const SUBTITLE_KEYS: Record<ConnectorKind, string> = {
  MONGODB: 'intel.settings.connectors.subtitle.MONGODB',
  MCP: 'intel.settings.connectors.subtitle.MCP',
  SLACK: 'intel.settings.connectors.subtitle.SLACK',
  GMAIL: 'intel.settings.connectors.subtitle.GMAIL',
  GITHUB: 'intel.settings.connectors.subtitle.GITHUB',
};

/** Settings › one connector kind: its connectors, and adding / editing them with credentials picked from the Tech portal. */
export default function ConnectorsSection({ kind: rawKind }: Readonly<{ kind: string }>) {
  const kind = rawKind as ConnectorKind;
  const { t } = useTranslation();
  const list = useQuery<ConnectorsData>(INTEL_CONNECTORS, { variables: { kind }, fetchPolicy: 'cache-and-network' });
  const entries = useQuery<EntryOptionsData>(INTEL_ENTRY_OPTIONS, { variables: { kind } });
  const refetch = () => fireAndForget(list.refetch(), intelLog, '/setting', 'ConnectorsSection');
  const actions = useConnectorActions(kind, refetch);
  const [editing, setEditing] = useState<IntelConnector | null>(null);
  const [open, setOpen] = useState(false);
  const rows = list.data?.intelConnectors ?? [];
  const formValues = useMemo(() => toConnectorValues(kind, editing), [kind, editing]);
  const openForm = (c: IntelConnector | null) => {
    actions.clearFormError();
    setEditing(c);
    setOpen(true);
  };

  return (
    <SectionCard title={t(TITLE_KEYS[kind])} subtitle={t(SUBTITLE_KEYS[kind])}>
      <Stack spacing={1.5}>
        <Alert severity="info">{t('intel.settings.techPortalNote')}</Alert>
        {kind === 'MONGODB' && <Alert severity="warning">{t('intel.settings.connectors.productionNote')}</Alert>}
        <div>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm(null)}>{t('intel.settings.connectors.add')}</Button>
        </div>
        {list.error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={refetch}>{t('intel.common.retry')}</Button>}>{t('intel.settings.connectors.loadFailed')}</Alert>}
        {list.loading && !list.data && <Skeleton variant="rounded" height={140} />}
        {list.data && rows.length === 0 && <EmptyState title={t('intel.settings.connectors.empty')} body={t('intel.settings.connectors.emptyBody')} />}
        {rows.map((c) => (
          <ConnectorCard key={c.id} connector={c} actions={actions} testResult={actions.testResult?.id === c.id ? actions.testResult.result : null} onEdit={() => openForm(c)} />
        ))}
      </Stack>
      <ConnectorForm
        open={open}
        kind={kind}
        editing={Boolean(editing)}
        values={formValues}
        entries={entries.data?.intelEntryOptions ?? []}
        saving={actions.saving}
        errorMessage={actions.formError}
        onSubmit={(values) => fireAndForget(actions.save(editing, values).then((ok) => ok && setOpen(false)), intelLog, '/setting', 'ConnectorsSection.save')}
        onClose={() => setOpen(false)}
      />
    </SectionCard>
  );
}
