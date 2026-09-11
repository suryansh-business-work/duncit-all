import { Box, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import type { TimelineStep } from './productOrders';

/** The dot a step wears: done (green check) / current (coral) / still to come (muted). */
function stepDot(step: TimelineStep) {
  if (step.done) return { Icon: CheckCircleIcon, color: 'primary.main' };
  if (step.current) return { Icon: RadioButtonCheckedIcon, color: 'secondary.main' };
  return { Icon: RadioButtonUncheckedIcon, color: 'text.disabled' };
}

/** Vertical fulfilment timeline — the steps joined by a hairline rail.
 * Native twin: components/pod-history/OrderTrackingTimeline. */
export default function OrderTrackingTimeline({ steps }: Readonly<{ steps: TimelineStep[] }>) {
  return (
    <Stack spacing={0}>
      {steps.map((step, i) => {
        const { Icon, color } = stepDot(step);
        const isLast = i === steps.length - 1;
        return (
          <Stack key={step.status} direction="row" spacing={1.25} sx={{
            alignItems: "flex-start"
          }}>
            <Stack sx={{
              alignItems: "center"
            }}>
              <Icon sx={{ fontSize: 18, color }} />
              {!isLast && <Box sx={{ width: 2, height: 16, my: 0.25, bgcolor: 'divider' }} />}
            </Stack>
            <Typography
              variant="body2"
              sx={{
                fontWeight: step.current ? 600 : 500,
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
