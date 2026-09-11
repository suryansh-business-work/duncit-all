import { Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { SURFACE_SX } from '../../../theme';

interface IncompleteBannerProps {
  percent: number;
  onComplete: () => void;
}

/** "Your profile is incomplete" nudge — shown when completion < 100%; the
 * green pill opens Account. */
export default function IncompleteBanner({ percent, onComplete }: Readonly<IncompleteBannerProps>) {
  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          ...SURFACE_SX,
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'secondary.main', flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 14, fontWeight: 600 }}>
              Your profile is incomplete
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {percent}% complete
            </Typography>
          </Box>
        </Stack>
        <DuncitButton
          onClick={onComplete}
          variant="contained"
          size="small"
          sx={{ flexShrink: 0, height: 36, minHeight: 36, px: 2 }}
        >
          Complete
        </DuncitButton>
      </Stack>
    </Box>
  );
}
