import { Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// TODO(i18n) — banner copy ships as literals until this feature is localized.
const HEADING = 'Your Pod will go live once the venue accepts your slot request.';
const SUBHEADING =
  "We've sent your slot request to the venue. You'll be notified as soon as the venue approves or declines your request.";

/** Top banner of the waiting page — big yellow tick, heading + subheading,
 * top-center aligned. Native twin (rule 27). */
export default function PendingBanner() {
  return (
    <Stack spacing={1.25} alignItems="center" sx={{ py: 2 }} data-testid="pod-pending-banner">
      <CheckCircleIcon sx={{ fontSize: 64, color: 'warning.main' }} />
      <Typography variant="h6" fontWeight={700} textAlign="center">
        {HEADING}
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        {SUBHEADING}
      </Typography>
    </Stack>
  );
}
