import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Box } from '@mui/material';
import { GigSurfaceProvider, type GigSurfaceConfig } from '@duncit/gig-jobs';
import { logs } from '@duncit/logs';
import { FREELANCER_PROFILE_PATH } from '@duncit/utils';
import { urlConfigs } from '../../config/url-configs';

/**
 * The Partners console's frame for Gig Jobs. Hosts, venue owners and brand
 * owners post and manage gigs here; the freelancer profile is Earn with
 * Duncit's step on mWeb, so it opens there in a new tab — the same way this
 * console's Earn page opens the onboarding surveys.
 */
export default function PartnersGigsShell({ children }: Readonly<{ children: ReactNode }>) {
  const navigate = useNavigate();
  const surface = useMemo<GigSurfaceConfig>(
    () => ({
      go: (path) => navigate(path),
      openFreelancerProfile: () => {
        globalThis.open(`${urlConfigs.mwebUrl}${FREELANCER_PROFILE_PATH}`, '_blank', 'noopener,noreferrer');
      },
      logger: logs.portal['partners-app'],
    }),
    [navigate],
  );

  return (
    <Box sx={{ maxWidth: 880, width: '100%' }}>
      <GigSurfaceProvider value={surface}>{children}</GigSurfaceProvider>
    </Box>
  );
}
