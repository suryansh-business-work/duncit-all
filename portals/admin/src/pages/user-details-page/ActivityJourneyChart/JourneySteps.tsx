import { Box, Chip, Stack, Typography } from '@mui/material';
import { formatTime } from '@duncit/app-settings';
import { actionColor, eventLabel, pageLabel, type ActivityEvent } from './helpers';

interface Props {
  steps: ActivityEvent[];
  /** Card tint, computed once by the chart from the theme. */
  stepBg: string;
}

/** Horizontal strip of journey steps, joined by connector bars. */
export function JourneySteps({ steps, stepBg }: Readonly<Props>) {
  return (
    <Box sx={{ mt: 1.5, overflowX: 'auto', pb: 0.5 }}>
      <Stack
        direction="row"
        spacing={1.25}
        sx={{
          alignItems: "stretch",
          minWidth: 'max-content'
        }}>
        {steps.map((event, index) => (
          <Stack key={event.id} direction="row" spacing={1.25} sx={{
            alignItems: "center"
          }}>
            <Box
              sx={{
                width: 190,
                minHeight: 92,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.5,
                p: 1,
                bgcolor: stepBg,
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>{formatTime(event.occurred_at)}</Typography>
                <Chip size="small" color={actionColor(event.event_type)} label={event.event_type} />
              </Stack>
              <Typography
                variant="body2"
                noWrap
                sx={{
                  fontWeight: 700,
                  mt: 0.75
                }}>{pageLabel(event)}</Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{
                  color: "text.secondary",
                  display: "block"
                }}>{eventLabel(event)}</Typography>
            </Box>
            {index < steps.length - 1 && (
              <Box sx={{ width: 28, height: 2, bgcolor: 'divider', borderRadius: 999 }} />
            )}
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
