import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { APP_SHELL_MAX_WIDTH } from '../../app/appLayout';
import PodActionPanel from './PodActionPanel';

interface Props {
  pod: any;
  isFree: boolean;
  isHost: boolean;
  priceFormat: (amount: number) => string;
  membershipState: any;
  joining: boolean;
  backingOut: boolean;
  restoringSpot: boolean;
  seats: number;
  onSeatsChange: (seats: number) => void;
  onJoinFree: () => void;
  onBackout: () => void;
  onKeepSpot: () => void;
  onPaidCheckout: () => void;
  onCopyReferral: (token: string) => void;
  onGoToDashboard: () => void;
}

/** The booking bar: a floating 24px surface card above the bottom nav, price
 * or state on the left and the one green action on the right.
 * Native twin: details/PodBookingBar. */
export default function StickyPodActionPanel(props: Readonly<Props>) {
  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'calc(var(--duncit-bottom-nav-overlay-offset, 88px) + 8px)',
        zIndex: (theme) => theme.zIndex.appBar + 1,
        px: 2,
        pointerEvents: 'none',
      }}
    >
      {/* The whole bar, not just the Book button: which control sits here depends
          on whether the viewer is the host, already in, backing out or still
          deciding, and the tour describes the bar's job either way. */}
      <Box
        data-tour="pod-book"
        sx={{
          maxWidth: APP_SHELL_MAX_WIDTH,
          mx: 'auto',
          p: 1,
          borderRadius: '24px',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: (theme) => `0 8px 24px ${alpha(theme.palette.common.black, 0.12)}`,
          pointerEvents: 'auto',
        }}
      >
        <PodActionPanel {...props} />
      </Box>
    </Box>
  );
}
