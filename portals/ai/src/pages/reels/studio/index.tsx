import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Navigate, useParams } from 'react-router';
import { Alert, Box, Paper } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { FillViewport, QueryGuard } from '@duncit/ui';
import { ReelProjectForm, type ReelProjectFormValues } from '../../../forms/reel-project';
import { REEL_PROJECT } from '../queries';
import type { ReelProject } from '../types';
import ChatPanel from './chat/ChatPanel';
import ExportDialog from './export/ExportDialog';
import { useReelExport } from './export/useReelExport';
import PreviewPane from './preview/PreviewPane';
import SourcesPanel from './sources/SourcesPanel';
import StudioToolbar from './StudioToolbar';
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

/**
 * The studio: footage on the left, the reel in the middle, the conversation on
 * the right. The three are one screen because they are one loop — pick a clip,
 * say what to do with it, watch it change.
 */
function Studio({ project }: Readonly<{ project: ReelProject }>) {
  const actions = useReelActions(project.id);
  const exporter = useReelExport(project);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const openDetails = () => setDetailsOpen(true);

  const saveDetails = async (values: ReelProjectFormValues) => {
    if (await actions.saveDetails(values)) setDetailsOpen(false);
  };

  return (
    <FillViewport>
      <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, borderRadius: 2, overflow: 'hidden' }} data-testid="reel-studio">
        <StudioToolbar project={project} onEditDetails={openDetails} onExport={exporter.start} />
        <Box sx={PANES_SX}>
          <Box sx={{ ...PANE_SX, borderRight: { lg: '1px solid' }, borderBottom: { xs: '1px solid', lg: 'none' } }}>
            <SourcesPanel project={project} actions={actions} onEditDetails={openDetails} />
          </Box>
          <Box sx={{ ...PANE_SX, borderRight: { lg: '1px solid' }, borderBottom: { xs: '1px solid', lg: 'none' } }}>
            <PreviewPane project={project} />
          </Box>
          <Box sx={PANE_SX}>
            <ChatPanel project={project} actions={actions} />
          </Box>
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
