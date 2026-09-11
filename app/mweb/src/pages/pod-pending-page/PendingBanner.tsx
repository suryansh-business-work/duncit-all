import type { ReactElement } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { pendingBannerState, type ApprovalTone, type PendingBannerIcon } from './podPending';

const ICON = { fontSize: 24 } as const;

const BANNER_ICONS: Record<PendingBannerIcon, ReactElement> = {
  'check-circle': <CheckCircleIcon sx={ICON} />,
  cancel: <CancelIcon sx={ICON} />,
};

const TONE_COLORS: Record<ApprovalTone, string> = {
  warning: 'warning.main',
  success: 'success.main',
  error: 'error.main',
};

/** Top card of the waiting page — the venue decision's tick on a soft disc
 * (amber pending, green approved, red declined) beside the matching heading and
 * its one line. Native twin (rule 27). */
export default function PendingBanner({ status }: Readonly<{ status: string }>) {
  const { t } = useTranslation();
  const banner = pendingBannerState(status, t);

  return (
    <Stack
      direction="row"
      spacing={1.5}
      data-testid="pod-pending-banner"
      sx={{ ...SURFACE_SX, p: 2, alignItems: 'flex-start' }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.hover',
          color: TONE_COLORS[banner.tone],
        }}
      >
        {BANNER_ICONS[banner.icon]}
      </Box>
      <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary' }}>
          {banner.title}
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', lineHeight: 1.4, color: 'text.secondary' }}>
          {banner.body}
        </Typography>
      </Stack>
    </Stack>
  );
}
