import { useCallback, useMemo, useState } from 'react';
import { Box, Paper } from '@mui/material';
import type { PlayerRef } from '@remotion/player';
import { useTabParam } from '@duncit/tabs';
import { useTranslation, type Translate } from '@duncit/shell';
import { FillViewport, type PortalTourStep } from '@duncit/ui';
import { ReelProjectForm, type ReelProjectFormValues } from '../../../forms/reel-project';
import RunsGuide from '../../activity-page/RunsGuide';
import { framesToMs, type ReelSelection } from '../editor/layout';
import { usePlayerFrame } from '../editor/usePlayerFrame';
import { useSpecEditor } from '../editor/useSpecEditor';
import type { ReelProject } from '../types';
import ChatPanel from './chat/ChatPanel';
import CreatePanel from './create/CreatePanel';
import ExportDialog from './export/ExportDialog';
import ReelComposer from './export/ReelComposer';
import { useReelExport } from './export/useReelExport';
import { useReelPost } from './export/useReelPost';
import InspectorPanel from './inspector/InspectorPanel';
import PreviewPane from './preview/PreviewPane';
import SourcesPanel from './sources/SourcesPanel';
import StudioDialogs from './tools/StudioDialogs';
import { useStudioTools } from './tools/useStudioTools';
import StudioSidePanel, { type SideTab } from './StudioSidePanel';
import StudioToolbar from './StudioToolbar';
import TimelinePanel from './timeline/TimelinePanel';
import { useReelActions } from './useReelActions';

const TOUR_ID = 'marketing.reelStudio';

const tourSteps = (t: Translate): PortalTourStep[] => [
  { anchor: 'studio-create', title: t('ai.reels.guide.tourCreateTitle'), body: t('ai.reels.guide.tourCreateBody') },
  { anchor: 'studio-sources', title: t('ai.reels.guide.tourSourcesTitle'), body: t('ai.reels.guide.tourSourcesBody') },
  { anchor: 'studio-timeline', title: t('ai.reels.guide.tourTimelineTitle'), body: t('ai.reels.guide.tourTimelineBody') },
  { anchor: 'studio-validate', title: t('ai.reels.guide.tourValidateTitle'), body: t('ai.reels.guide.tourValidateBody') },
  { anchor: 'studio-export', title: t('ai.reels.guide.tourExportTitle'), body: t('ai.reels.guide.tourExportBody') },
];

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
 * The studio: footage on the left, the reel in the middle, the conversation,
 * the Create flow or the selected item's settings on the right, and the
 * timeline across the bottom. They are one screen because they are one loop —
 * pick a clip, say or do what should change, watch it change.
 *
 * Hand edits go through `useSpecEditor`: the player, the timeline, the
 * inspector and the export all draw its draft, so an edit shows everywhere the
 * moment it is made, and is saved a moment later.
 */
export default function Studio({ project }: Readonly<{ project: ReelProject }>) {
  const { t } = useTranslation();
  const actions = useReelActions(project.id);
  const editor = useSpecEditor(project);
  const live = useMemo(() => ({ ...project, spec: editor.spec }), [project, editor.spec]);
  const tools = useStudioTools(project);
  const exporter = useReelExport(live);
  const postSource = useMemo(() => ({ projectId: project.id, caption: tools.caption }), [project.id, tools.caption]);
  const poster = useReelPost(postSource, exporter.state.phase === 'rendered');
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const playheadMs = framesToMs(usePlayerFrame(player), editor.spec.fps);
  const [selection, setSelection] = useState<ReelSelection | null>(null);
  const tabItems = useMemo(
    () => [
      { value: 'chat' as const, label: t('ai.reels.editor.tabChat') },
      { value: 'create' as const, label: t('ai.reels.editor.tabCreate') },
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
  const deselect = useCallback(() => setSelection(null), []);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const openDetails = () => setDetailsOpen(true);

  const saveDetails = async (values: ReelProjectFormValues) => {
    if (await actions.saveDetails(values)) setDetailsOpen(false);
  };

  return (
    <FillViewport>
      <Box sx={{ mb: 1 }}>
        <RunsGuide id={TOUR_ID} summary={t('ai.reels.guide.studioSummary')} steps={[]} tour={tourSteps(t)} />
      </Box>
      <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, borderRadius: 2, overflow: 'hidden' }} data-testid="reel-studio">
        <StudioToolbar
          project={live}
          checks={tools.checks}
          onEditDetails={openDetails}
          onTool={tools.open}
          onCover={() => actions.setCover(playheadMs)}
          settingCover={actions.settingCover}
          onExport={exporter.start}
        />
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
              create={<CreatePanel project={project} />}
              edit={<InspectorPanel spec={editor.spec} assets={project.assets} selection={selection} apply={editor.apply} onDeselect={deselect} />}
            />
          </Box>
        </Box>
        <Box sx={TIMELINE_SX} data-tour="studio-timeline">
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
      <ExportDialog exporter={exporter} poster={poster} />
      {poster.composer && <ReelComposer request={poster.composer} onClose={poster.closeComposer} />}
      <StudioDialogs tools={tools} project={project} actions={actions} />
    </FillViewport>
  );
}
