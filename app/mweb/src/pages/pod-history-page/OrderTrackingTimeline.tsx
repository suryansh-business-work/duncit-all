import { Box, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import type { TimelineStep } from './productOrders';

/** Vertical fulfilment timeline — done (check) / current (filled) / pending. */
export default function OrderTrackingTimeline({ steps }: Readonly<{ steps: TimelineStep[] }>) {
  return (
    <Stack spacing={0}>
      {steps.map((step, i) => {
        let Icon = RadioButtonUncheckedIcon;
        let color = 'text.disabled';
        if (step.done) {
          Icon = CheckCircleIcon;
          color = 'success.main';
        } else if (step.current) {
          Icon = RadioButtonCheckedIcon;
          color = 'primary.main';
        }
        const isLast = i === steps.length - 1;
        return (
          <Stack key={step.status} direction="row" spacing={1.25} alignItems="flex-start">
            <Stack alignItems="center">
              <Icon sx={{ fontSize: 18, color }} />
              {!isLast && <Box sx={{ width: 2, height: 16, bgcolor: step.done ? 'success.main' : 'divider' }} />}
            </Stack>
            <Typography
              variant="body2"
              sx={{
                fontWeight: step.current ? 800 : 500,
                color: step.current ? 'text.primary' : 'text.secondary',
                pb: isLast ? 0 : 1,
              }}
            >
              {step.label}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
}
