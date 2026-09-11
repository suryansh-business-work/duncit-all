import { Box, Stack, Typography } from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { SURFACE_SX } from '../../../theme';
import { REFERRAL_TILE } from './profileSections';

/** The full-width "Refer & Earn" featured card — an accent gift on a soft disc
 * and the label; the title says it all. */
export default function ReferralCard({ onNavigate }: Readonly<{ onNavigate: (to: string) => void }>) {
  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      <Stack
        direction="row"
        spacing={1.5}
        onClick={() => onNavigate(REFERRAL_TILE.to)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onNavigate(REFERRAL_TILE.to);
        }}
        sx={{
          ...SURFACE_SX,
          p: 2,
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'border-color 160ms ease',
          '&:hover': { borderColor: 'divider' },
        }}
        aria-label={REFERRAL_TILE.label}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: 'secondary.main',
            bgcolor: 'action.hover',
            flexShrink: 0,
          }}
        >
          <CardGiftcardIcon />
        </Box>
        <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600 }}>
          {REFERRAL_TILE.label}
        </Typography>
        <ChevronRightIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
      </Stack>
    </Box>
  );
}
