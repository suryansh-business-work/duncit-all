import { Box, Button, Stack, Typography } from '@mui/material';

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
        alignItems="center"
        justifyContent="space-between"
        spacing={1.5}
        sx={{
          px: 1.75,
          py: 1.25,
          borderRadius: 2.5,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={800} noWrap>
              Your profile is incomplete
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {percent}% complete
            </Typography>
          </Box>
        </Stack>
        <Button
          onClick={onComplete}
          variant="contained"
          size="small"
          sx={{ borderRadius: 999, fontWeight: 800, flexShrink: 0, bgcolor: 'text.primary', color: 'background.paper', '&:hover': { bgcolor: 'text.secondary' } }}
        >
          Complete
        </Button>
      </Stack>
    </Box>
  );
}
