import { useQuery } from '@apollo/client/react';
import { useParams } from 'react-router';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import CostSummary from './CostSummary';
import SeatCanvas from './SeatCanvas';
import { PUBLIC_TEAM_STRUCTURE } from './queries';
import type { TeamNode, TeamStructureInfo } from './types';

interface Data {
  publicTeamStructure: { show_salary: boolean; structure: TeamStructureInfo; nodes: TeamNode[] } | null;
}

/**
 * The chart behind a share link, with no sign-in and no way to edit. Whether
 * pay appears was decided by HR when the link was made and is enforced on the
 * server, so this page simply shows what it was sent.
 */
export default function PublicTeamPage() {
  const { token = '' } = useParams();
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<Data>(PUBLIC_TEAM_STRUCTURE, { variables: { token } });
  const view = data?.publicTeamStructure;

  if (loading) return <CircularProgress aria-label={t('hr.teamStructure.loading')} sx={{ m: 4 }} />;
  if (error || !view) return <Alert severity="warning" sx={{ m: 2 }}>{t('hr.teamStructure.public.unavailable')}</Alert>;

  return (
    <Stack spacing={1.5} sx={{ p: 2, height: '100vh' }} component="main">
      <Typography variant="h5" component="h1">{view.structure.name}</Typography>
      {view.structure.description && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{view.structure.description}</Typography>}
      {view.show_salary && <CostSummary nodes={view.nodes} currency={view.structure.currency} />}
      <Box sx={{ flex: 1, border: 1, borderColor: 'divider' }}>
        <SeatCanvas nodes={view.nodes} currency={view.structure.currency} selectedId={null} onSelect={() => undefined} />
      </Box>
    </Stack>
  );
}
