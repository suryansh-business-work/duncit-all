import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { DuncitRoundButton } from '@duncit/buttons';
import { GigSurfaceProvider, type GigSurfaceConfig } from '@duncit/gig-jobs';
import { logs } from '@duncit/logs';
import { FREELANCER_PROFILE_PATH } from '@duncit/utils';
import { useAppLocation } from '../../app/AppLocationContext';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * mWeb's frame for every Gig Jobs screen: the calm inner-page back button,
 * the reading column, and in-app links (the freelancer profile is an mWeb
 * route here — Earn with Duncit's freelancer step).
 */
export default function GigsShell({ children, testId }: Readonly<{ children: ReactNode; testId: string }>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locationId } = useAppLocation();
  const surface = useMemo<GigSurfaceConfig>(
    () => ({
      go: (path) => navigate(path),
      openFreelancerProfile: () => navigate(FREELANCER_PROFILE_PATH),
      logger: logs.mWeb,
      // The board starts on the header's city, as the pods lists do.
      selectedLocationId: locationId,
    }),
    [navigate, locationId],
  );

  return (
    <Stack data-testid={testId} spacing={2} sx={{ maxWidth: 720, mx: 'auto', width: '100%', px: 2, py: 1, pb: { xs: 10, sm: 8 } }}>
      <DuncitRoundButton
        onClick={() => navigate(-1)}
        aria-label={t('mweb.common.back')}
        sx={{ width: 40, height: 40, minWidth: 40, minHeight: 40, bgcolor: 'background.paper', color: 'text.primary' }}
      >
        <ArrowBackRoundedIcon />
      </DuncitRoundButton>
      <GigSurfaceProvider value={surface}>{children}</GigSurfaceProvider>
    </Stack>
  );
}
