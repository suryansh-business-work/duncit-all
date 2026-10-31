import { useQuery } from '@apollo/client/react';
import { Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { ReelProjectForm } from '../../../forms/reel-project';
import { REEL_PROJECTS } from '../queries';
import type { ReelProjectSummary } from '../types';
import ProjectsTable from './ProjectsTable';
import { useProjectActions } from './useProjectActions';

const EMPTY: ReelProjectSummary[] = [];

/** Reel Studio — every reel, newest edit first. A row opens its studio. */
export default function ReelProjectsPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ reelProjects: ReelProjectSummary[] }>(REEL_PROJECTS, {
    fetchPolicy: 'cache-and-network',
  });
  const rows = data?.reelProjects ?? EMPTY;
  const actions = useProjectActions(() => {
    refetch().catch(() => undefined);
  });

  return (
    <Box data-testid="reel-projects-page">
      <PageHeader
        title={t('ai.reels.list.title')}
        subtitle={t('ai.reels.list.subtitle')}
        actions={
          <DuncitButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => actions.setCreateOpen(true)}
            data-testid="reel-new-project"
          >
            {t('ai.reels.list.newReel')}
          </DuncitButton>
        }
        sx={{ mb: 2 }}
      />
      <QueryGuard loading={loading && !data} error={error}>
        <ProjectsTable rows={rows} onOpen={actions.open} onDelete={actions.destroy} />
      </QueryGuard>
      <ReelProjectForm
        open={actions.createOpen}
        submitting={actions.creating}
        onClose={() => actions.setCreateOpen(false)}
        onSubmit={actions.create}
      />
    </Box>
  );
}
