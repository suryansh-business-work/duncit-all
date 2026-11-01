import { useQuery } from '@apollo/client/react';
import { Box, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, QueryGuard, type PortalTourStep } from '@duncit/ui';
import { useTranslation, type Translate } from '@duncit/shell';
import { ReelProjectForm } from '../../../forms/reel-project';
import RunsGuide from '../../activity-page/RunsGuide';
import { REEL_PROJECTS } from '../queries';
import type { ReelProjectSummary } from '../types';
import ProjectsTable from './ProjectsTable';
import { useProjectActions } from './useProjectActions';

const EMPTY: ReelProjectSummary[] = [];
const TOUR_ID = 'marketing.reels';

const tourSteps = (t: Translate): PortalTourStep[] => [
  { anchor: 'reels-new', title: t('ai.reels.guide.tourNewTitle'), body: t('ai.reels.guide.tourNewBody') },
  { anchor: 'reels-table', title: t('ai.reels.guide.tourTableTitle'), body: t('ai.reels.guide.tourTableBody') },
];

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
    <Stack spacing={2} data-testid="reel-projects-page">
      <PageHeader
        title={t('ai.reels.list.title')}
        subtitle={t('ai.reels.list.subtitle')}
        actions={
          <DuncitButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => actions.setCreateOpen(true)}
            data-tour="reels-new"
            data-testid="reel-new-project"
          >
            {t('ai.reels.list.newReel')}
          </DuncitButton>
        }
      />
      <RunsGuide
        id={TOUR_ID}
        summary={t('ai.reels.guide.listSummary')}
        steps={[t('ai.reels.guide.listStep1'), t('ai.reels.guide.listStep2'), t('ai.reels.guide.listStep3')]}
        tour={tourSteps(t)}
      />
      <QueryGuard loading={loading && !data} error={error}>
        <Box data-tour="reels-table">
          <ProjectsTable rows={rows} onOpen={actions.open} onDelete={actions.destroy} />
        </Box>
      </QueryGuard>
      <ReelProjectForm
        open={actions.createOpen}
        submitting={actions.creating}
        onClose={() => actions.setCreateOpen(false)}
        onSubmit={actions.create}
      />
    </Stack>
  );
}
