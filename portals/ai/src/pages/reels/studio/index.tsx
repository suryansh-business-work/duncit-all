import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Navigate, useParams } from 'react-router';
import { Alert, Box, Paper } from '@mui/material';
import type { PlayerRef } from '@remotion/player';
import { useTabParam } from '@duncit/tabs';
import { useTranslation } from '@duncit/shell';
import { FillViewport, QueryGuard } from '@duncit/ui';
import { ReelProjectForm, type ReelProjectFormValues } from '../../../forms/reel-project';
import type { ReelSelection } from '../editor/layout';
import { useSpecEditor } from '../editor/useSpecEditor';
import { REEL_PROJECT } from '../queries';
import type { ReelProject } from '../types';
import ChatPanel from './chat/ChatPanel';
import ExportDialog from './export/ExportDialog';
import InspectorPanel from './inspector/InspectorPanel';
import { useReelExport } from './export/useReelExport';
import PreviewPane from './preview/PreviewPane';
import SourcesPanel from './sources/SourcesPanel';
import StudioSidePanel, { type SideTab } from './StudioSidePanel';
import StudioToolbar from './StudioToolbar';
import TimelinePanel from './timeline/TimelinePanel';
import { useReelActions } from './useReelActions';

/** Reel Studio — one reel. Route: /reels/:projectId */
export default function ReelStudioPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ reelProject: ReelProject | null }>(REEL_PROJECT, {
    variables: { id: projectId },
    skip: !projectId,
    fetchPolicy: 'cache-and-network',
  });
  if (!projectId) return <Navigate to="/reels" replace />;
  const project = data?.reelProject ?? null;

  return (
    <QueryGuard loading={loading && !project} error={error}>
      {project ? (
        <Studio project={project} />
      ) : (
        <Alert severity="warning" data-testid="reel-studio-not-found">
          {t('ai.reels.studio.notFound')}
        </Alert>
      )}
    </QueryGuard>
  );
}

/** Each pane scrolls inside itself; on a narrow window they stack and the page scrolls instead. */
const PANES_SX = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', lg: '320px minmax(0, 1fr) 380px' },
  gridTemplateRows: { xs: 'minmax(360px, auto) minmax(480px, 70vh) minmax(480px, 70vh)', lg: 'minmax(0, 1fr)' },
  overflowY: { xs: 'auto', lg: 'hidden' },
  borderTop: '1px solid',
  borderColor: 'divider',
} as const;

const PANE_SX = { minWidth: 0, minHeight: 0, borderColor: 'divider' } as const;

/** The timeline row: fixed on a wide screen so the panes keep the rest; full height of its tracks below that. */
const TIMELINE_SX = { height: { xs: 320, lg: 'clamp(240px, 32vh, 360px)' }, flexShrink: 0, borderTop: '1px solid', borderColor: 'divider' } as const;

/**
 * The studio: footage on the left, the reel in the middle, the conversation (or
 * the selected item's settings) on the right, and the timeline across the
 * bottom. They are one screen because they are one loop — pick a clip, say or
 * do what should change, watch it change.
 *
 * Hand edits go through `useSpecEditor`: the player, the timeline, the
 * inspector and the export all draw its draft, so an edit shows everywhere the
 * moment it is made, and is saved a moment later.
 */
function Studio({ project }: Readonly<{ project: ReelProject }>) {
  const { t } = useTranslation();
  const actions = useReelActions(project.id);
  const editor = useSpecEditor(project);
  const live = useMemo(() => ({ ...project, spec: editor.spec }), [project, editor.spec]);
  const exporter = useReelExport(live);
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const [selection, setSelection] = useState<ReelSelection | null>(null);
  const tabItems = useMemo(
    () => [
      { value: 'chat' as const, label: t('ai.reels.editor.tabChat') },
      { value: 'edit' as const, label: t('ai.reels.editor.tabEdit') },
    ],
    [t]
  );
  const tabs = useTabParam<SideTab>({ items: tabItems, fallback: 'chat' });
  const openEdit = tabs.onChange;
  const select = useCallback(
    (next: ReelSelection | null) => {
      setSelection(next);
      if (next) openEdit('edit');
    },
    [openEdit]
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const openDetails = () => setDetailsOpen(true);

  const saveDetails = async (values: ReelProjectFormValues) => {
    if (await actions.saveDetails(values)) setDetailsOpen(false);
  };

  return (
    <FillViewport>
      <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, borderRadius: 2, overflow: 'hidden' }} data-testid="reel-studio">
        <StudioToolbar project={live} onEditDetails={openDetails} onExport={exporter.start} />
        <Box sx={PANES_SX}>
          <Box sx={{ ...PANE_SX, borderRight: { lg: '1px solid' }, borderBottom: { xs: '1px solid', lg: 'none' } }}>
            <SourcesPanel project={project} actions={actions} onEditDetails={openDetails} />
          </Box>
          <Box sx={{ ...PANE_SX, borderRight: { lg: '1px solid' }, borderBottom: { xs: '1px solid', lg: 'none' } }}>
            <PreviewPane project={live} onPlayer={setPlayer} />
          </Box>
          <Box sx={PANE_SX}>
            <StudioSidePanel
              tabs={tabs}
              chat={<ChatPanel project={project} actions={actions} />}
              edit={<InspectorPanel spec={editor.spec} assets={project.assets} selection={selection} apply={editor.apply} />}
            />
          </Box>
        </Box>
        <Box sx={TIMELINE_SX}>
          <TimelinePanel assets={project.assets} player={player} selection={selection} onSelect={select} editor={editor} />
        </Box>
      </Paper>
      <ReelProjectForm
        open={detailsOpen}
        initialValues={{ name: project.name, drive_url: project.drive_url }}
        submitting={actions.saving}
        onClose={() => setDetailsOpen(false)}
        onSubmit={saveDetails}
      />
      <ExportDialog exporter={exporter} />
    </FillViewport>
  );
}
