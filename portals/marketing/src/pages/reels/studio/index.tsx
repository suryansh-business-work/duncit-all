import { useQuery } from '@apollo/client/react';
import { Navigate, useParams } from 'react-router';
import { Alert } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { QueryGuard } from '@duncit/ui';
import { REEL_PROJECT } from '../queries';
import type { ReelProject } from '../types';
import Studio from './Studio';

/** Reel Studio — one reel. Route: /reels/:projectId */
export default function ReelStudioPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ reelProject: ReelProject | null }>(REEL_PROJECT, {
    variables: { id: projectId },
    skip: !projectId,
    fetchPolicy: 'cache-and-network',
  });
  if (!projectId) return <Navigate to="/studio/reels" replace />;
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
