import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Box, Paper } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { AUTOMATION_FLOW, AUTOMATION_OPTIONS } from '../queries';
import { CHANNEL_SLUGS, channelFromSlug, type AutomationChannel, type AutomationFlow, type AutomationOptions, type FlowStatus } from '../types';
import { useFlowGraph } from './useFlowGraph';
import { useFlowSave } from './useFlowSave';
import BuilderToolbar, { type SidePanelKind } from './BuilderToolbar';
import FlowCanvas from './FlowCanvas';
import NodePalette from './NodePalette';
import SidePanel from './SidePanel';
import RunContactDialog from './RunContactDialog';

/** Automation > flow — the builder. Route: /automation/:channel/:flowId */
export default function AutomationBuilderPage() {
  const { channel: slug, flowId } = useParams<{ channel: string; flowId: string }>();
  const channel = channelFromSlug(slug);
  if (!channel || !flowId) return <Navigate to="/" replace />;
  return <Builder channel={channel} flowId={flowId} />;
}

function Builder({ channel, flowId }: Readonly<{ channel: AutomationChannel; flowId: string }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const graph = useFlowGraph(channel);
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<FlowStatus>('DRAFT');
  const [issueCount, setIssueCount] = useState(0);
  const [panel, setPanel] = useState<SidePanelKind>('inspector');
  const [fullScreen, setFullScreen] = useState(false);
  const [runNowOpen, setRunNowOpen] = useState(false);

  const flowQuery = useQuery<{ automationFlow: AutomationFlow | null }>(AUTOMATION_FLOW, { variables: { id: flowId }, fetchPolicy: 'network-only' });
  const optionsQuery = useQuery<{ automationOptions: AutomationOptions }>(AUTOMATION_OPTIONS, { variables: { channel }, fetchPolicy: 'cache-and-network' });
  const flow = flowQuery.data?.automationFlow ?? null;
  const options = optionsQuery.data?.automationOptions ?? null;

  const takeFlow = useCallback(
    (saved: AutomationFlow) => {
      setName(saved.name);
      setSavedName(saved.name);
      setDescription(saved.description);
      setStatus(saved.status);
      setIssueCount(saved.issues.length);
      graph.applyIssues(saved.issues);
      graph.markSaved();
    },
    [graph]
  );

  // Load the canvas once. A refetch must not overwrite what is being edited.
  const loadedId = useRef<string | null>(null);
  useEffect(() => {
    if (!flow || loadedId.current === flow.id) return;
    loadedId.current = flow.id;
    graph.load(flow);
    takeFlow(flow);
  }, [flow, graph, takeFlow]);

  // Leaving the tab with unsaved work asks first (the browser's own prompt).
  useEffect(() => {
    if (!graph.dirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    globalThis.addEventListener('beforeunload', warn);
    return () => globalThis.removeEventListener('beforeunload', warn);
  }, [graph.dirty]);

  const { save, setStatus: changeStatus, saving, changingStatus } = useFlowSave({ flowId, channel, onSaved: takeFlow });

  const onIssues = useCallback(
    (issues: AutomationFlow['issues']) => {
      setIssueCount(issues.length);
      graph.applyIssues(issues);
    },
    [graph]
  );

  const dirty = graph.dirty || name !== savedName;

  const onSave = () => {
    save(name, description, graph.nodes, graph.edges).catch(() => undefined);
  };
  const onToggleActive = () => {
    changeStatus(status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE', onIssues).catch(() => undefined);
  };
  const back = () => navigate(`/automation/${CHANNEL_SLUGS[channel]}`);

  const frameSx = fullScreen
    ? { position: 'fixed' as const, inset: 0, zIndex: (theme: { zIndex: { modal: number } }) => theme.zIndex.modal, bgcolor: 'background.default' }
    : { height: 'calc(100dvh - 150px)', minHeight: 560 };

  return (
    <QueryGuard loading={(flowQuery.loading && !flow) || (optionsQuery.loading && !options)} error={flowQuery.error ?? optionsQuery.error}>
      {flow && options ? (
        <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden', ...frameSx }} data-testid="automation-builder">
          <BuilderToolbar
            name={name}
            status={status}
            issueCount={issueCount}
            dirty={dirty}
            saving={saving}
            changingStatus={changingStatus}
            panel={panel}
            onNameChange={setName}
            onBack={back}
            onSave={onSave}
            onToggleActive={onToggleActive}
            onRunNow={() => setRunNowOpen(true)}
            onPanel={setPanel}
          />
          <Box sx={{ display: 'flex', flex: 1, minHeight: 0, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box component="aside" aria-label={t('ai.automation.builder.palette')} sx={{ width: 250, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid', borderColor: 'divider' }}>
              <NodePalette channel={channel} onAdd={(kind) => graph.addNode(kind)} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <FlowCanvas graph={graph} fullScreen={fullScreen} onToggleFullScreen={() => setFullScreen((value) => !value)} />
            </Box>
            <Box component="aside" aria-label={t('ai.automation.builder.inspectorTitle')} sx={{ width: 380, flexShrink: 0, overflowY: 'auto', borderLeft: '1px solid', borderColor: 'divider' }}>
              <SidePanel
                panel={panel}
                flowId={flowId}
                channel={channel}
                options={options}
                selected={graph.selected}
                nodes={graph.nodes}
                edges={graph.edges}
                onChange={graph.updateConfig}
                onRemove={graph.removeNode}
                onConnect={graph.connect}
                onDisconnect={graph.disconnect}
                onIssues={onIssues}
                onClosePanel={() => setPanel('inspector')}
              />
            </Box>
          </Box>
          <RunContactDialog open={runNowOpen} flowId={flowId} channel={channel} onClose={() => setRunNowOpen(false)} onStarted={() => setPanel('runs')} />
        </Paper>
      ) : (
        <Box sx={{ p: 2 }}>{t('ai.automation.builder.notFound')}</Box>
      )}
    </QueryGuard>
  );
}
