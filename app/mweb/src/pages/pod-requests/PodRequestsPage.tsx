import { Stack } from '@mui/material';
import MoveToInboxRoundedIcon from '@mui/icons-material/MoveToInboxRounded';
import StudioPageHeader from '../../components/StudioPageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import type { PodRequestSide } from '@duncit/utils';
import PodRequestsSection from './PodRequestsSection';

/**
 * Studio menu → Requests → Pod Requests: the inbox that used to live only
 * inside Host / Venue Studio, given its own page so the menu can open it
 * directly (`/host/pod-requests`, `/venues/pod-requests`). The section is the
 * same one the studio page shows — not a second copy.
 */
export default function PodRequestsPage({ side }: Readonly<{ side: PodRequestSide }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2} sx={{ px: 2, py: 2 }} data-testid={`pod-requests-page-${side.toLowerCase()}`}>
      <StudioPageHeader icon={<MoveToInboxRoundedIcon fontSize="small" />} title={t('mweb.studioNav.podRequests')} />
      <PodRequestsSection side={side} />
    </Stack>
  );
}
