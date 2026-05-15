import { Box } from '@mui/material';
import PodActionPanel from './PodActionPanel';

interface Props {
  pod: any;
  isFree: boolean;
  priceFormat: (amount: number) => string;
  membershipState: any;
  joining: boolean;
  backingOut: boolean;
  onJoinFree: () => void;
  onBackout: () => void;
  onPaidCheckout: () => void;
  onCopyReferral: (token: string) => void;
}

export default function StickyPodActionPanel(props: Props) {
  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'var(--duncit-bottom-nav-overlay-offset, 88px)',
        zIndex: (theme) => theme.zIndex.appBar + 1,
        px: { xs: 2, sm: 3 },
        py: 1,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        boxShadow: '0 -10px 28px rgba(0,0,0,0.16)',
      }}
    >
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <PodActionPanel {...props} />
      </Box>
    </Box>
  );
}
