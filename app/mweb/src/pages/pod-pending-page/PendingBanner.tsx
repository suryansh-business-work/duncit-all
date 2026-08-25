import type { ReactElement } from 'react';
import { Stack, Typography } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from '../../i18n/useTranslation';
import { pendingBannerState, type ApprovalTone, type PendingBannerIcon } from './podPending';

const ICON = { fontSize: 64 } as const;

const BANNER_ICONS: Record<PendingBannerIcon, ReactElement> = {
  'check-circle': <CheckCircleIcon sx={ICON} />,
  cancel: <CancelIcon sx={ICON} />,
};

const TONE_COLORS: Record<ApprovalTone, string> = {
  warning: 'warning.main',
  success: 'success.main',
  error: 'error.main',
};

/** Top banner of the waiting page — a big tick in the venue decision's colour
 * (amber pending, green approved, red declined) over the matching heading and
 * subheading, top-center aligned. Native twin (rule 27). */
export default function PendingBanner({ status }: Readonly<{ status: string }>) {
  const { t } = useTranslation();
  const banner = pendingBannerState(status, t);

  return (
    <Stack
      spacing={1.25}
      data-testid="pod-pending-banner"
      sx={{
        alignItems: "center",
        py: 2,
        color: TONE_COLORS[banner.tone]
      }}>
      {BANNER_ICONS[banner.icon]}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          textAlign: "center",
          color: "text.primary"
        }}>
        {banner.title}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          textAlign: "center"
        }}>
        {banner.body}
      </Typography>
    </Stack>
  );
}
