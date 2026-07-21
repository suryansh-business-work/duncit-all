import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { APP_SHELL_MAX_WIDTH } from '../../app/appLayout';
import PodActionPanel from './PodActionPanel';

interface Props {
  pod: any;
  isFree: boolean;
  priceFormat: (amount: number) => string;
  membershipState: any;
  joining: boolean;
  backingOut: boolean;
  restoringSpot: boolean;
  selectedProductTotal: number;
  onJoinFree: () => void;
  onBackout: () => void;
  onKeepSpot: () => void;
  onPaidCheckout: () => void;
  onCopyReferral: (token: string) => void;
}

export default function StickyPodActionPanel(props: Readonly<Props>) {
  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'calc(var(--duncit-bottom-nav-overlay-offset, 88px) + 2px)',
        zIndex: (theme) => theme.zIndex.appBar + 1,
        px: { xs: 1.25, sm: 2 },
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          maxWidth: APP_SHELL_MAX_WIDTH,
          mx: 'auto',
          p: 0.75,
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.88 : 0.94),
          backdropFilter: 'blur(18px)',
          boxShadow: '0 16px 36px rgba(15,23,42,0.22)',
          pointerEvents: 'auto',
        }}
      >
        <PodActionPanel {...props} />
      </Box>
    </Box>
  );
}
