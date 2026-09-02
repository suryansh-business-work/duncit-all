import { Fade, Stack, Typography } from '@mui/material';
import { AI_MONITOR_MOTION } from '@duncit/utils';
import { AiMonitorGlyph } from './AiMonitorGlyph';
import { aiMotion, aiPulse } from './motion';

const { sweepMs } = AI_MONITOR_MOTION;

export interface AiProcessingInlineProps {
  visible: boolean;
  /** What the check is doing, in the reader's language. */
  label: string;
  testId?: string;
}

/**
 * The same wait, in a row rather than over the whole screen — for a step that
 * runs its AI check without taking the page away.
 *
 * The badge is `AiProcessingOverlay`'s, at a line's height and still emitting
 * rings, so the two waits read as one thing happening at two scales. A
 * `CircularProgress` here would say "loading", which is what every other
 * spinner on the page already says.
 */
export function AiProcessingInline({
  visible,
  label,
  testId,
}: Readonly<AiProcessingInlineProps>) {
  return (
    <Fade in={visible} unmountOnExit>
      <Stack
        direction="row"
        spacing={1.25}
        data-testid={testId}
        role="status"
        sx={{ alignItems: 'center', p: 1.25, borderRadius: 2, bgcolor: 'action.hover' }}
      >
        <AiMonitorGlyph size={20} rings />
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, ...aiMotion(`${aiPulse} ${sweepMs}ms ease-in-out infinite`) }}
        >
          {label}
        </Typography>
      </Stack>
    </Fade>
  );
}
