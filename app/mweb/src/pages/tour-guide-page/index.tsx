import { Fragment } from 'react';
import { useNavigate } from 'react-router';
import { Box, Divider, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitRoundButton } from '@duncit/buttons';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { isTourCompleted, toursForRoles } from '@duncit/tours';
import { useTours } from '../../tours/useTours';
import { useTranslation } from '../../i18n/useTranslation';
import { SURFACE_SX } from '../../theme';
import TourRow from './TourRow';

/**
 * Tour Guide centre — every guided walkthrough, restartable at any time.
 *
 * The list comes from `@duncit/tours`, so adding a screen's tour is one registry
 * entry and it appears here (and in the native centre) with no change to this
 * page. Starting a tour navigates to the screen it runs on and arms it; the
 * Joyride runtime picks it up when that screen mounts.
 */
const TOUR_ROLES = gql`
  query TourRoles {
    me {
      user_id
      roles
    }
  }
`;

export default function TourGuidePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { completed, startTour } = useTours();
  const { data } = useQuery<any>(TOUR_ROLES, { fetchPolicy: 'cache-first' });
  // Create Pod walks through a screen a non-host cannot open, so it is hidden
  // rather than offered as a dead end.
  const tours = toursForRoles(data?.me?.roles ?? []);

  return (
    <Stack
      spacing={2}
      sx={{ maxWidth: 720, mx: 'auto', width: '100%', px: 2, pt: 1, pb: { xs: 10, sm: 8 } }}
    >
      {/* The inner-page header, as native's StackScreen draws it. */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <DuncitRoundButton
          tone="paper"
          onClick={() => navigate(-1)}
          aria-label={t('mweb.tourGuide.back')}
          sx={{ width: 40, height: 40, minWidth: 40, minHeight: 40, borderColor: 'var(--duncit-card-border)' }}
        >
          <ArrowBackIcon />
        </DuncitRoundButton>
        <Typography component="h1" noWrap sx={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 600 }}>
          {t('mweb.tourGuide.tourGuide')}
        </Typography>
      </Stack>
      <Box sx={{ ...SURFACE_SX, overflow: 'hidden' }}>
        {tours.map((tour, index) => (
          <Fragment key={tour.id}>
            {index > 0 ? <Divider sx={{ mx: 2 }} /> : null}
            <TourRow
              tour={tour}
              done={isTourCompleted(completed, tour.id)}
              onStart={() => {
                startTour(tour.id);
                navigate(tour.path);
              }}
            />
          </Fragment>
        ))}
      </Box>
    </Stack>
  );
}
