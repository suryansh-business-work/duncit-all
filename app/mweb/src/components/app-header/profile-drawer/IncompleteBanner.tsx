import { Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

interface IncompleteBannerProps {
  percent: number;
  onComplete: () => void;
}

/** "Your profile is incomplete" nudge — shown when completion < 100%. */
export default function IncompleteBanner({ percent, onComplete }: Readonly<IncompleteBannerProps>) {
  return (
    <Box sx={{ px: 2, pb: 1.25 }}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.75,
          py: 1.25,
          borderRadius: '16px',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}>
        <Stack
          direction="row"
          spacing={1.25}
          sx={{
            alignItems: "center",
            minWidth: 0
          }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{
              fontWeight: 600
            }}>
              Your profile is incomplete
            </Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {percent}% complete
            </Typography>
          </Box>
        </Stack>
        <DuncitButton
          onClick={onComplete}
          variant="contained"
          size="small"
          sx={{ borderRadius: 999, fontWeight: 600, flexShrink: 0, bgcolor: 'text.primary', color: 'background.paper', '&:hover': { bgcolor: 'text.secondary' } }}
        >
          Complete
        </DuncitButton>
      </Stack>
    </Box>
  );
}
