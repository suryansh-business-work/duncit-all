import { useState } from 'react';
import { Alert, Stack } from '@mui/material';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { gigViewerAction, type GigJob, type GigViewer } from '@duncit/utils';
import { useGigSurface } from '../GigSurfaceProvider';
import GigOwnerActions from './GigOwnerActions';
import InterestDialog from './InterestDialog';

/**
 * The one thing this viewer can do on this gig (shared rule:
 * `gigViewerAction`) — manage it, show interest, join as a freelancer first,
 * or read that it is closed. A shared contact needs no action: it is shown.
 */
export default function GigViewerActions({ job, viewer }: Readonly<{ job: GigJob; viewer: GigViewer | null }>) {
  const { t } = useTranslation();
  const { openFreelancerProfile } = useGigSurface();
  const [interestOpen, setInterestOpen] = useState(false);
  const action = gigViewerAction(job, viewer);

  if (action === 'MANAGE') return <GigOwnerActions job={job} />;
  if (action === 'CONTACT_SHARED') return null;
  if (action === 'CLOSED') return <Alert severity="warning">{t('gigJobs.detail.closed')}</Alert>;
  if (action === 'JOIN_AS_FREELANCER') {
    return (
      <Stack spacing={1.5}>
        <Alert severity="info">{t('gigJobs.interest.joinBody')}</Alert>
        <DuncitButton variant="contained" onClick={openFreelancerProfile}>
          {t('gigJobs.interest.joinCta')}
        </DuncitButton>
        <Alert severity="info" variant="outlined">
          {t('gigJobs.contact.hidden')}
        </Alert>
      </Stack>
    );
  }
  return (
    <Stack spacing={1.5}>
      <DuncitButton
        variant="contained"
        startIcon={<HandshakeOutlinedIcon />}
        onClick={() => setInterestOpen(true)}
        data-testid="gig-interest-open"
      >
        {t('gigJobs.interest.cta')}
      </DuncitButton>
      <Alert severity="info" variant="outlined">
        {t('gigJobs.contact.hidden')}
      </Alert>
      <InterestDialog job={job} open={interestOpen} onClose={() => setInterestOpen(false)} />
    </Stack>
  );
}
