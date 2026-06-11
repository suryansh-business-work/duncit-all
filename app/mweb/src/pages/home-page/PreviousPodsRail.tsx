import { Box, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HistoryIcon from '@mui/icons-material/History';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PodCard from './PodCard';
import { podUrl } from '../../utils/seoUrls';

interface Props {
  pods: any[];
  hostNameOf: (pod: any) => string | null;
}

/** Bottom-of-home rail of pods whose date has already passed, with a "See all"
 * link to the dedicated Previous Pods page (bug 8). Hidden when there are none. */
export default function PreviousPodsRail({ pods, hostNameOf }: Readonly<Props>) {
  const navigate = useNavigate();
  if (pods.length === 0) return null;

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.25 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <HistoryIcon color="action" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              Previous Pods
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Already taken place
            </Typography>
          </Box>
        </Stack>
        <Button
          size="small"
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate('/previous-pods')}
          sx={{ fontWeight: 800 }}
        >
          See all
        </Button>
      </Stack>
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          overflowX: 'auto',
          pb: 0.5,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {pods.slice(0, 10).map((pod: any) => (
          <PodCard
            key={pod.id}
            pod={pod}
            hostName={hostNameOf(pod)}
            onOpen={() => navigate(podUrl(pod.club_slug, pod.pod_id))}
          />
        ))}
      </Box>
    </Stack>
  );
}
