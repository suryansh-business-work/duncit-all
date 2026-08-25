import { Box, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SensorsIcon from '@mui/icons-material/Sensors';
import PodCard from './PodCard';
import { podUrl } from '../../utils/seoUrls';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  pods: any[];
  hostNameOf: (pod: any) => string | null;
}

/**
 * The rail for pods that are RUNNING right now — started, not yet finished.
 *
 * These used to fall straight into Previous Pods the moment they began, which
 * read as "already over" while the pod still had hours left. They get their own
 * band instead, and only move to Previous once their end time passes.
 *
 * There is no See-all: the band is bounded by the pods' own end times, not by a
 * page size, so a link to a fuller list would have nothing extra to show.
 * Cards open the pod detail as everywhere else — where booking is closed, which
 * is why nothing here offers a join.
 */
export default function OngoingPodsRail({ pods, hostNameOf }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (pods.length === 0) return null;

  return (
    <Stack spacing={1.25} data-testid="ongoing-pods-rail">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 0.25 }}>
        <SensorsIcon color="success" />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
            {t('mweb.home.ongoingPodsTitle')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {t('mweb.home.ongoingPodsSubtitle')}
          </Typography>
        </Box>
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
        {pods.map((pod: any) => (
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
