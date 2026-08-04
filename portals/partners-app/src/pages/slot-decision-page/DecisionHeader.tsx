import { Box, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import { format } from 'date-fns';

type Decision = 'NONE' | 'APPROVED' | 'DECLINED';

const GRADIENTS: Record<Decision, string> = {
  APPROVED: 'linear-gradient(135deg, #0f766e 0%, #16a34a 100%)',
  DECLINED: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)',
  NONE: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)',
};

/** The hero that tells the owner, in one line, what just happened. */
export default function DecisionHeader({
  decision,
  startAt,
}: Readonly<{ decision: Decision; startAt: string }>) {
  const when = format(new Date(startAt), 'EEE, d MMM yyyy · h:mm a');

  let icon = <HourglassTopIcon sx={{ fontSize: 44 }} />;
  let eyebrow = 'Awaiting your decision';
  let title = 'A host wants to book your venue';
  let subtitle = `They have asked for ${when}. Approve it to put the pod live.`;

  if (decision === 'APPROVED') {
    icon = <CheckCircleIcon sx={{ fontSize: 44 }} />;
    eyebrow = 'Booking confirmed';
    title = 'Your venue is booked';
    subtitle = `Blocked for ${when}. The pod is live and open for bookings.`;
  } else if (decision === 'DECLINED') {
    icon = <CancelIcon sx={{ fontSize: 44 }} />;
    eyebrow = 'Booking declined';
    title = 'You turned this slot down';
    subtitle = `${when} is open again on your calendar.`;
  }

  return (
    <Box
      sx={{
        borderRadius: 3,
        p: { xs: 2.5, sm: 3 },
        color: 'common.white',
        background: GRADIENTS[decision],
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        {icon}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" sx={{ opacity: 0.85 }}>
            {eyebrow}
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
