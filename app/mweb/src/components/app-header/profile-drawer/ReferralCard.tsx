import { Box, Paper, Stack, Typography } from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { REFERRAL_TILE } from './profileSections';

/** The full-width "Refer & Earn" featured card (green gift accent). */
export default function ReferralCard({ onNavigate }: Readonly<{ onNavigate: (to: string) => void }>) {
  return (
    <Box sx={{ px: 2, pb: 1.25 }}>
      <Paper
        variant="outlined"
        onClick={() => onNavigate(REFERRAL_TILE.to)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onNavigate(REFERRAL_TILE.to);
        }}
        sx={{
          p: 1.5,
          borderRadius: 3,
          cursor: 'pointer',
          transition: 'border-color 160ms ease',
          '&:hover': { borderColor: 'success.main' },
        }}
        aria-label={REFERRAL_TILE.label}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              display: 'grid',
              placeItems: 'center',
              color: 'success.main',
              bgcolor: 'rgba(34,197,94,0.14)',
              flexShrink: 0,
            }}
          >
            <CardGiftcardIcon />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography fontWeight={800} noWrap>
              {REFERRAL_TILE.label}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {REFERRAL_TILE.caption}
            </Typography>
          </Box>
          <ChevronRightIcon color="disabled" />
        </Stack>
      </Paper>
    </Box>
  );
}
